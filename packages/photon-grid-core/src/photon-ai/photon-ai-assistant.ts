/**
 * The **Photon AI Assistant** — the branch of Photon AI that answers questions
 * instead of operating the grid.
 *
 * `PhotonAIService` turns "sort by salary" into a grid action. This handles
 * everything else a user might type into the same box:
 *
 * | Request kind | Source of truth | Model's role |
 * |---|---|---|
 * | "how do I use this with React?" | curated {@link KNOWLEDGE_ARTICLES} | select + phrase |
 * | "generate dummy columns" | {@link ScaffoldGenerator} | none — returned verbatim |
 * | "what sells best?" | {@link DataAnalysisService}, computed locally | narrate the numbers |
 * | "why is my grid slow?" | {@link GridDoctor}, reading live config | narrate the findings |
 *
 * The through-line: **facts are computed or curated locally; the model only
 * phrases them.** That is what keeps answers accurate about a library the model
 * has never seen, keeps row data on the user's machine, and keeps token cost
 * proportional to the answer rather than the dataset.
 *
 * @packageDocumentation
 */

import type { GridApi } from '../core/grid-api';
import type { GridOptions } from '../types/grid.types';
import type { ThemeVariableRegistryReader } from '../types/theme-ai.types';
import type { PhotonAIProvider } from './provider/ai-provider.types';
import { describeProviderError } from './provider/ai-provider.types';
import { retrieveArticles, serializeArticles } from './knowledge/knowledge-retriever';
import { ScaffoldGenerator } from './knowledge/scaffold-generator';
import { DataAnalysisService } from './insight/data-analysis-service';
import { GridDoctor } from './insight/grid-doctor';

/** What kind of non-command request this is. */
export enum AssistantRequestKind {
  /** Documentation, examples, "how do I…". */
  Knowledge = 'knowledge',
  /** "Generate columns / a dataset / theme variables / datasource code". */
  Generate = 'generate',
  /** Questions about the data itself. */
  Analyze = 'analyze',
  /** Questions about the grid's health or configuration. */
  Diagnose = 'diagnose',
}

/** Outcome of an assistant attempt. `handled: false` means "not my request". */
export interface AssistantResult {
  readonly handled: boolean;
  readonly message: string;
  readonly success?: boolean;
}

const NOT_HANDLED: AssistantResult = { handled: false, message: '' };

/* ── Classification vocabularies ──────────────────────────────────────────
 * These are lexical *gates*, not answer logic — the same approach the theme
 * engine already uses to claim styling requests. They decide which subsystem
 * computes the facts; the facts themselves are never keyword-derived.
 */

const GENERATE_RE = /\b(generate|create|scaffold|give me|show me|make me|write|build)\b/i;
const COLUMN_TARGET_RE = /\b(column|columns|coldef|coldefs|column definitions?)\b/i;
const DATASET_TARGET_RE = /\b(dataset|data set|dummy data|sample data|test data|mock data|fake data|rows?)\b/i;
const THEME_VARS_RE = /\b(theme variables?|css variables?|theme tokens?|design tokens?|all variables?)\b/i;
const DATASOURCE_TARGET_RE = /\b(datasource|data source|server[- ]?side)\b/i;
const EXPORT_TARGET_RE = /\b(export|csv|excel|xlsx|download)\b/i;
const VALIDATION_TARGET_RE = /\b(validation|validator|validate|rules?)\b/i;

/**
 * Analytical vocabulary.
 *
 * Deliberately excludes business nouns like "revenue", "sales", and "profit".
 * Those name the *subject* of a question, not the intent, and they are also
 * ordinary column names — including them made "sort by revenue descending"
 * classify as analysis and swallow a plain sort command. Intent words only.
 */
const ANALYZE_RE =
  /\b(best|worst|highest|lowest|average|trend|trending|growth|decreasing|increasing|declining|rising|falling|correlat\w*|outlier|unusual|anomal\w*|summar\w*|insight|predict|forecast|analy[sz]e|analysis|distribution|breakdown)\b/i;

/**
 * Verbs that begin a grid command.
 *
 * A prompt opening with one of these is an instruction to operate the grid, so
 * the assistant declines it outright and lets the command pipeline — which owns
 * the intent registry and live state — handle it. This runs before the other
 * gates because an imperative like "show me the top rows" would otherwise read
 * as an analysis request.
 */
const COMMAND_VERB_RE =
  /^\s*(please\s+)?(sort|filter|pin|unpin|hide|show|group|ungroup|select|deselect|clear|expand|collapse|move|copy|cut|paste|export|import|reset|resize|scroll|highlight)\b/i;

const DIAGNOSE_RE =
  /\b(slow|slower|laggy|lag|jank|stutter|performance|optimi[sz]e|duplicate|mistakes?|misconfigur\w*|wrong|broken|issues?|problems?|accessib\w*|a11y|aria|audit|diagnos\w*|health|why is my)\b/i;

const KNOWLEDGE_RE =
  /\b(how|what|why|when|where|which|explain|does|do|can|should|is|are|guide|tutorial|example|documentation|docs|difference|work|works)\b/i;

/** Questions about the *grid's own state* belong to the command AI, not here. */
const GRID_STATE_RE = /\b(sorted|filtered|pinned|hidden|grouped|selected|visible rows?|row count|column count)\b/i;

/**
 * Answers non-command Photon AI requests.
 *
 * Construct one per grid. {@link handle} returns `handled: false` for anything
 * it does not claim, so the caller can fall through to the command pipeline —
 * the same contract `PhotonThemeEngine.handlePanelCommand` already uses.
 */
export class PhotonAIAssistant {
  private readonly generator = new ScaffoldGenerator();
  private readonly analysis: DataAnalysisService;
  private readonly doctor: GridDoctor;

  constructor(
    private readonly api: GridApi,
    private readonly options: GridOptions,
    private readonly provider: PhotonAIProvider | null,
    private readonly themeRegistry: ThemeVariableRegistryReader | null,
  ) {
    this.analysis = new DataAnalysisService(api);
    this.doctor = new GridDoctor(api, options);
  }

  /**
   * Attempts to answer `prompt`.
   *
   * @returns `handled: false` when this is a grid command rather than a question.
   */
  async handle(prompt: string, signal?: AbortSignal): Promise<AssistantResult> {
    const kind = this.classify(prompt);
    if (kind === null) return NOT_HANDLED;

    try {
      switch (kind) {
        case AssistantRequestKind.Generate:
          return this.handleGenerate(prompt);
        case AssistantRequestKind.Analyze:
          return await this.handleAnalyze(prompt, signal);
        case AssistantRequestKind.Diagnose:
          return await this.handleDiagnose(prompt, signal);
        case AssistantRequestKind.Knowledge:
        default:
          return await this.handleKnowledge(prompt, signal);
      }
    } catch (err) {
      return { handled: true, success: false, message: describeProviderError(err) };
    }
  }

  /**
   * Decides which branch — if any — owns this prompt.
   *
   * Order matters:
   * 1. Generation first, because "generate columns" also matches knowledge.
   * 2. Imperative grid commands bail out — they belong to the command AI.
   * 3. Live-state questions bail out for the same reason.
   * 4. Diagnose before analyse ("why is my grid slow" contains neither's
   *    vocabulary exclusively).
   * 5. Knowledge last, and only when the corpus actually has something.
   */
  private classify(prompt: string): AssistantRequestKind | null {
    const text = prompt.trim();
    if (text.length === 0) return null;

    if (this.isGenerateRequest(text)) return AssistantRequestKind.Generate;

    // "sort by revenue descending" is a command, not a question about revenue.
    if (COMMAND_VERB_RE.test(text)) return null;

    // Live grid state is the command AI's job — it has the real state in context.
    if (GRID_STATE_RE.test(text)) return null;

    if (DIAGNOSE_RE.test(text)) return AssistantRequestKind.Diagnose;
    if (ANALYZE_RE.test(text)) return AssistantRequestKind.Analyze;

    // A bare "what?" should fall through to the command AI rather than be
    // answered from a loosely-related article.
    if (KNOWLEDGE_RE.test(text) && retrieveArticles(text).length > 0) {
      return AssistantRequestKind.Knowledge;
    }

    return null;
  }

  private isGenerateRequest(text: string): boolean {
    if (THEME_VARS_RE.test(text)) return true;
    if (!GENERATE_RE.test(text)) return false;
    return (
      COLUMN_TARGET_RE.test(text) ||
      DATASET_TARGET_RE.test(text) ||
      DATASOURCE_TARGET_RE.test(text) ||
      EXPORT_TARGET_RE.test(text) ||
      VALIDATION_TARGET_RE.test(text)
    );
  }

  /** Generation is fully deterministic — no provider needed, no tokens spent. */
  private handleGenerate(prompt: string): AssistantResult {
    if (THEME_VARS_RE.test(prompt)) {
      if (!this.themeRegistry) {
        return { handled: true, success: false, message: 'The theme registry is not available on this grid.' };
      }
      return { handled: true, success: true, message: this.generator.generateThemeVariables(this.themeRegistry) };
    }

    if (DATASOURCE_TARGET_RE.test(prompt)) {
      return { handled: true, success: true, message: this.generator.generateServerDatasource() };
    }
    if (VALIDATION_TARGET_RE.test(prompt)) {
      return { handled: true, success: true, message: this.generator.generateValidationRules(this.api.getAllColumns()) };
    }
    if (EXPORT_TARGET_RE.test(prompt)) {
      return { handled: true, success: true, message: this.generator.generateExportCode() };
    }

    const wantsColumns = COLUMN_TARGET_RE.test(prompt);
    const wantsData = DATASET_TARGET_RE.test(prompt);
    const rowCount = extractCount(prompt) ?? 25;

    if (wantsColumns && wantsData) {
      return { handled: true, success: true, message: this.generator.generateFullExample(rowCount) };
    }
    if (wantsData) {
      return { handled: true, success: true, message: this.generator.generateDataset(rowCount) };
    }
    return {
      handled: true,
      success: true,
      message: this.generator.generateColumns(extractCount(prompt) ?? undefined),
    };
  }

  /** Retrieves the relevant article(s) and has the model answer strictly from them. */
  private async handleKnowledge(prompt: string, signal?: AbortSignal): Promise<AssistantResult> {
    const retrieved = retrieveArticles(prompt);
    if (retrieved.length === 0) return NOT_HANDLED;

    // Without a provider, return the article itself. It is already good
    // Markdown with runnable code, so an offline grid still answers usefully —
    // just without the tailoring a model would add.
    if (!this.provider) {
      return { handled: true, success: true, message: retrieved[0].article.body };
    }

    const reply = await this.ask(
      [
        'You are Photon AI, the assistant built into the Photon Grid data grid.',
        'Answer the user\'s question about how to use Photon Grid.',
        '',
        'RULES:',
        '- Use ONLY the APIs in the documentation below. Never invent an option,',
        '  method, or component, and never borrow an API from another grid library.',
        '- Include a code example when one is relevant, in a fenced block with a',
        '  language tag. Match the user\'s framework if they named one.',
        '- Be concise: a short explanation plus the code, not an essay.',
        '- Reply in Markdown. Do not wrap the whole answer in one code fence.',
      ].join('\n'),
      `${serializeArticles(retrieved)}\n\nUSER QUESTION:\n${prompt}`,
      signal,
    );

    // A provider hiccup shouldn't lose the answer — the article stands alone.
    return { handled: true, success: true, message: reply || retrieved[0].article.body };
  }

  /** Computes statistics locally, then has the model narrate them. */
  private async handleAnalyze(prompt: string, signal?: AbortSignal): Promise<AssistantResult> {
    const analysis = this.analysis.analyze();

    if (analysis.visibleRows === 0) {
      return { handled: true, success: true, message: 'There are no rows to analyse right now — the grid is empty or everything is filtered out.' };
    }
    if (analysis.numeric.length === 0 && analysis.dimensions.length === 0) {
      return {
        handled: true,
        success: true,
        message: 'I could not find numeric columns to analyse. Analysis needs at least one column typed as `number`, `currency`, or `percentage`.',
      };
    }

    if (!this.provider) {
      return { handled: true, success: true, message: formatAnalysisFallback(analysis) };
    }

    const reply = await this.ask(
      [
        'You are Photon AI, a data analyst embedded in a data grid.',
        'Answer the user\'s question using ONLY the statistics provided. They were',
        'computed from the full visible dataset, so they are exact — never estimate,',
        'and never claim to have seen individual rows.',
        '',
        'RULES:',
        '- Lead with the direct answer, then the numbers that support it.',
        '- Format currency and percentages readably; round sensibly.',
        '- A "trendPerRow" is a least-squares slope over the current row order. It',
        '  describes the data as ordered; it is not a forecast. If asked to predict,',
        '  give the observed trend and say plainly that it is an extrapolation.',
        '- Correlation is not causation. Say "moves with", not "causes".',
        '- If the statistics do not answer the question, say so and name what would.',
        '- Reply in Markdown. Short paragraphs or a small table; no code fences.',
      ].join('\n'),
      `GRID STATISTICS (computed locally over ${analysis.visibleRows} visible rows of ${analysis.totalRows} total):\n${JSON.stringify(analysis)}\n\nUSER QUESTION:\n${prompt}`,
      signal,
    );

    return { handled: true, success: true, message: reply || formatAnalysisFallback(analysis) };
  }

  /** Inspects the live config, then has the model explain the findings. */
  private async handleDiagnose(prompt: string, signal?: AbortSignal): Promise<AssistantResult> {
    const findings = this.doctor.diagnose();

    if (findings.length === 0) {
      return {
        handled: true,
        success: true,
        message: 'I checked this grid\'s columns, performance settings, accessibility, and configuration and found no problems.',
      };
    }

    if (!this.provider) {
      const lines = findings.map((f) => `- **${f.severity}** (${f.category}): ${f.message}\n  - Fix: ${f.fix}`);
      return { handled: true, success: true, message: `I found ${findings.length} issue(s):\n\n${lines.join('\n')}` };
    }

    const reply = await this.ask(
      [
        'You are Photon AI, diagnosing a Photon Grid configuration.',
        'The findings below come from inspecting the live grid — they are facts',
        'about THIS grid, not general advice.',
        '',
        'RULES:',
        '- Report only the findings given. Do not invent additional problems.',
        '- Order by impact, most serious first, and explain why each one matters.',
        '- Give the concrete fix for each, with a small code snippet where useful.',
        '- If the findings do not explain what the user asked about, say so.',
        '- Reply in Markdown.',
      ].join('\n'),
      `DIAGNOSTIC FINDINGS:\n${JSON.stringify(findings)}\n\nUSER QUESTION:\n${prompt}`,
      signal,
    );

    return { handled: true, success: true, message: reply };
  }

  /**
   * One provider round-trip returning prose.
   *
   * These branches want a written answer, not grid actions, so the reply is
   * taken and any `actions` ignored. Reusing `provider.generate` keeps every
   * feature on the one configured back-end, with its timeout, abort handling,
   * and error taxonomy intact.
   */
  private async ask(system: string, user: string, signal?: AbortSignal): Promise<string> {
    const generation = await this.provider!.generate({
      systemInstruction: `${system}\n\nRespond with JSON: {"actions": [], "reply": "<your Markdown answer>"}`,
      gridContext: { columns: [], capabilities: [], state: { totalRowCount: 0, visibleRowCount: 0 } },
      userCommand: user,
      signal,
    });
    return generation.reply?.trim() ?? '';
  }
}

/** The first integer in the prompt, when it looks like a requested count. */
function extractCount(prompt: string): number | null {
  const match = /\b(\d{1,4})\b/.exec(prompt);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Offline rendering of an analysis, used when no provider is configured. */
function formatAnalysisFallback(analysis: ReturnType<DataAnalysisService['analyze']>): string {
  const lines: string[] = [`**Dataset summary** — ${analysis.visibleRows} of ${analysis.totalRows} rows, ${analysis.columnCount} columns.`, ''];

  for (const n of analysis.numeric.slice(0, 5)) {
    lines.push(
      `- **${n.header}** — total ${round(n.sum)}, average ${round(n.mean)}, range ${round(n.min)}–${round(n.max)}` +
        (n.outliers.length > 0 ? ` · ${n.outliers.length} outlier(s)` : ''),
    );
  }

  for (const d of analysis.dimensions.slice(0, 3)) {
    const top = d.top[0];
    if (top) {
      lines.push(`- Top **${d.dimensionHeader}** by ${d.measureHeader}: **${top.value}** (${round(top.total)}, ${(top.share * 100).toFixed(1)}%)`);
    }
  }

  for (const c of analysis.correlations.slice(0, 2)) {
    if (Math.abs(c.r) >= 0.5) {
      lines.push(`- \`${c.aColId}\` moves with \`${c.bColId}\` (r = ${c.r.toFixed(2)})`);
    }
  }

  return lines.join('\n');
}

function round(n: number): string {
  return Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2);
}
