import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseInline } from '../../src/photon-ai/chat/markdown-parser';
import { retrieveArticles, serializeArticles } from '../../src/photon-ai/knowledge/knowledge-retriever';
import { KNOWLEDGE_ARTICLES } from '../../src/photon-ai/knowledge/knowledge-base';
import { ScaffoldGenerator } from '../../src/photon-ai/knowledge/scaffold-generator';
import { DataAnalysisService } from '../../src/photon-ai/insight/data-analysis-service';
import { GridDoctor, DiagnosticSeverity } from '../../src/photon-ai/insight/grid-doctor';
import { PhotonAIAssistant } from '../../src/photon-ai/photon-ai-assistant';
import type { GridApi } from '../../src/core/grid-api';
import type { GridOptions } from '../../src/types/grid.types';
import type { ColumnDef } from '../../src/types/column.types';

/**
 * Covers the assistant branch of Photon AI: Markdown parsing, documentation
 * retrieval, deterministic scaffold generation, local data analysis, config
 * diagnostics, and the classifier that routes between them.
 */

/* ────────────────────────────── Markdown ────────────────────────────── */

describe('markdown parser', () => {
  it('parses a fenced code block with its language', () => {
    const blocks = parseMarkdown('Intro text\n\n```ts\nconst a = 1;\n```');
    expect(blocks[0]).toEqual({ kind: 'paragraph', lines: ['Intro text'] });
    expect(blocks[1]).toEqual({ kind: 'code', language: 'ts', code: 'const a = 1;' });
  });

  it('treats an unterminated fence as code running to the end', () => {
    // Happens constantly mid-stream; must not flash as prose.
    const blocks = parseMarkdown('```js\nconst x = 1;');
    expect(blocks[0]).toEqual({ kind: 'code', language: 'js', code: 'const x = 1;' });
  });

  it('preserves blank lines and indentation inside code', () => {
    const blocks = parseMarkdown('```\na\n\n  b\n```');
    expect(blocks[0]).toMatchObject({ kind: 'code', code: 'a\n\n  b' });
  });

  it('parses headings, ordered and unordered lists', () => {
    const blocks = parseMarkdown('## Title\n\n- one\n- two\n\n1. first\n2. second');
    expect(blocks[0]).toEqual({ kind: 'heading', level: 2, text: 'Title' });
    expect(blocks[1]).toEqual({ kind: 'list', ordered: false, items: ['one', 'two'] });
    expect(blocks[2]).toEqual({ kind: 'list', ordered: true, items: ['first', 'second'] });
  });

  it('parses inline code and bold', () => {
    expect(parseInline('use `api.setRowData()` now')).toEqual([
      { kind: 'text', text: 'use ' },
      { kind: 'code', text: 'api.setRowData()' },
      { kind: 'text', text: ' now' },
    ]);
    expect(parseInline('**important** note')).toEqual([
      { kind: 'strong', text: 'important' },
      { kind: 'text', text: ' note' },
    ]);
  });

  it('lets inline code win over emphasis', () => {
    expect(parseInline('`**literal**`')).toEqual([{ kind: 'code', text: '**literal**' }]);
  });

  it('leaves unmatched delimiters as literal text', () => {
    expect(parseInline('a ` b')).toEqual([{ kind: 'text', text: 'a ` b' }]);
    expect(parseInline('2 ** 3')).toEqual([{ kind: 'text', text: '2 ** 3' }]);
  });

  it('never yields markup as structure — HTML stays text', () => {
    // The renderer only ever uses textContent; the parser must not "helpfully"
    // interpret tags, or an injected <img onerror> could reach the DOM.
    const spans = parseInline('<img src=x onerror=alert(1)>');
    expect(spans).toEqual([{ kind: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });
});

/* ───────────────────────────── Retrieval ───────────────────────────── */

describe('knowledge retrieval', () => {
  const idsFor = (q: string) => retrieveArticles(q).map((r) => r.article.id);

  it('retrieves the right framework article', () => {
    expect(idsFor('how do I use this with React?')).toContain('quickstart-react');
    expect(idsFor('give me an Angular example')).toContain('quickstart-angular');
    expect(idsFor('vue example please')).toContain('quickstart-vue');
    expect(idsFor('vanilla javascript setup')).toContain('quickstart-vanilla');
  });

  it('retrieves installation, renderers, and concept articles', () => {
    expect(idsFor('what is the install command')).toContain('install');
    expect(idsFor('how do I render a custom cell')).toContain('custom-renderers');
    expect(idsFor('how does virtual scrolling work')).toContain('virtual-scrolling');
    expect(idsFor('what is the server side row model')).toContain('server-side-row-model');
    expect(idsFor('explain grouping')).toContain('grouping');
    expect(idsFor('explain filtering')).toContain('filtering');
    expect(idsFor('how do formulas recalculate')).toContain('formulas');
    expect(idsFor('how do pivot tables work')).toContain('pivot');
    expect(idsFor('improve accessibility')).toContain('accessibility');
  });

  it('returns nothing for an unrelated question', () => {
    expect(retrieveArticles('what is the weather today')).toEqual([]);
  });

  it('caps how many articles are sent, to bound token cost', () => {
    expect(retrieveArticles('react angular vue install export theme filter').length).toBeLessThanOrEqual(2);
  });

  it('does not match a keyword inside a longer word', () => {
    // "add" must not fire on "address".
    expect(idsFor('my address column is wrong')).not.toContain('install');
  });

  it('frames articles as authoritative when serialized', () => {
    const text = serializeArticles(retrieveArticles('react example'));
    expect(text).toContain('PHOTON GRID DOCUMENTATION');
    expect(text).toContain('do not substitute APIs from other grid libraries');
  });

  it('serializes to empty when nothing matched', () => {
    expect(serializeArticles([])).toBe('');
  });
});

describe('knowledge base accuracy', () => {
  const body = (id: string) => KNOWLEDGE_ARTICLES.find((a) => a.id === id)!.body;

  it('documents the real vanilla entry point, not the README\'s broken one', () => {
    const vanilla = body('quickstart-vanilla');
    expect(vanilla).toContain("createGrid('#grid'");
    expect(vanilla).not.toContain('new PhotonGrid(');
    expect(vanilla).not.toContain('rowData:');
  });

  it('uses the real Angular selector', () => {
    expect(body('quickstart-angular')).toContain('<photon-grid-angular');
  });

  it('never recommends the deprecated theme option', () => {
    for (const article of KNOWLEDGE_ARTICLES) {
      expect(article.body).not.toMatch(/theme:\s*'(light|dark)'/);
    }
  });

  it('warns about the React useMemo requirement', () => {
    expect(body('quickstart-react')).toContain('useMemo');
  });

  it('gives every article keywords and a body', () => {
    for (const article of KNOWLEDGE_ARTICLES) {
      expect(article.keywords.length).toBeGreaterThan(0);
      expect(article.body.length).toBeGreaterThan(80);
    }
  });

  it('has unique article ids', () => {
    const ids = KNOWLEDGE_ARTICLES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ───────────────────────────── Generators ───────────────────────────── */

describe('scaffold generator', () => {
  const gen = new ScaffoldGenerator();

  it('generates column definitions in a fenced block', () => {
    const out = gen.generateColumns();
    expect(out).toContain('```ts');
    expect(out).toContain('ColumnDef[]');
    expect(out).toContain("colId: 'revenue'");
  });

  it('honours a requested column count', () => {
    const out = gen.generateColumns(3);
    expect(out.match(/colId:/g)?.length).toBe(3);
  });

  it('generates a dataset of the requested size, deterministically', () => {
    const first = gen.generateDataset(5);
    expect(first).toBe(gen.generateDataset(5));
    const json = /```ts\nexport const data = ([\s\S]*?);\n```/.exec(first)![1];
    expect(JSON.parse(json)).toHaveLength(5);
  });

  it('produces data that matches the generated column types', () => {
    const json = /export const data = ([\s\S]*?);\n```/.exec(gen.generateDataset(3))![1];
    const rows = JSON.parse(json) as Record<string, unknown>[];
    expect(typeof rows[0].revenue).toBe('number');
    expect(typeof rows[0].active).toBe('boolean');
    expect(String(rows[0].joinDate)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('caps dataset size', () => {
    const json = /export const data = ([\s\S]*?);\n```/.exec(gen.generateDataset(100_000))![1];
    expect(JSON.parse(json).length).toBeLessThanOrEqual(500);
  });

  it('generates server datasource, export, and validation code', () => {
    expect(gen.generateServerDatasource()).toContain('ServerSideDatasource');
    expect(gen.generateServerDatasource()).toContain('params.signal');
    expect(gen.generateExportCode()).toContain('exportToCsv');
    expect(gen.generateValidationRules()).toContain('validator:');
  });

  it('renders the theme catalogue as usable CSS', () => {
    const registry = {
      getAll: () => [],
      getByCategory: (c: string) =>
        c === 'surface' ? [{ cssVar: '--pg-colors-surface', name: 'Surface', category: c, type: 'color', defaultValue: '#fff' }] : [],
      getByName: () => undefined,
      has: () => false,
      getCategories: () => [],
    } as never;
    const out = gen.generateThemeVariables(registry);
    expect(out).toContain('```css');
    expect(out).toContain('--pg-colors-surface: #fff;');
  });
});

/* ─────────────────────────────── Analysis ─────────────────────────────── */

const ANALYSIS_COLUMNS: ColumnDef[] = [
  { colId: 'product', field: 'product', header: 'Product', type: 'string' },
  { colId: 'revenue', field: 'revenue', header: 'Revenue', type: 'currency' },
  { colId: 'units', field: 'units', header: 'Units', type: 'number' },
];

function analysisApi(rows: Record<string, unknown>[], columns = ANALYSIS_COLUMNS): GridApi {
  const nodes = rows.map((data, i) => ({ type: 'data', nodeId: `r${i}`, data }));
  return {
    getAllRows: () => nodes,
    getVisibleRows: () => nodes,
    getAllColumns: () => columns,
  } as unknown as GridApi;
}

describe('data analysis service', () => {
  const rows = [
    { product: 'Widget', revenue: 100, units: 10 },
    { product: 'Widget', revenue: 200, units: 20 },
    { product: 'Gadget', revenue: 50, units: 5 },
    { product: 'Gizmo', revenue: 25, units: 2 },
  ];

  it('computes exact descriptive statistics', () => {
    const revenue = new DataAnalysisService(analysisApi(rows)).analyze().numeric.find((n) => n.colId === 'revenue')!;
    expect(revenue.count).toBe(4);
    expect(revenue.sum).toBe(375);
    expect(revenue.mean).toBeCloseTo(93.75);
    expect(revenue.min).toBe(25);
    expect(revenue.max).toBe(200);
    expect(revenue.median).toBeCloseTo(75);
  });

  it('ranks categories by measure — answering "best selling product"', () => {
    const dim = new DataAnalysisService(analysisApi(rows))
      .analyze()
      .dimensions.find((d) => d.dimensionColId === 'product' && d.measureColId === 'revenue')!;
    expect(dim.top[0].value).toBe('Widget');
    expect(dim.top[0].total).toBe(300);
    expect(dim.top[0].share).toBeCloseTo(300 / 375);
  });

  it('detects a linear relationship between measures', () => {
    const pair = new DataAnalysisService(analysisApi(rows))
      .analyze()
      .correlations.find((c) => c.aColId === 'revenue' && c.bColId === 'units')!;
    expect(pair.r).toBeGreaterThan(0.9);
  });

  it('reports a downward trend for declining values', () => {
    const declining = [100, 90, 80, 70, 60].map((revenue, i) => ({ product: 'W', revenue, units: i }));
    const summary = new DataAnalysisService(analysisApi(declining)).analyze().numeric.find((n) => n.colId === 'revenue')!;
    expect(summary.trendPerRow).toBeLessThan(0);
  });

  it('flags extreme values as outliers', () => {
    const withSpike = [...Array(30).fill(0).map(() => ({ product: 'W', revenue: 100, units: 1 })), { product: 'W', revenue: 100000, units: 1 }];
    const summary = new DataAnalysisService(analysisApi(withSpike)).analyze().numeric.find((n) => n.colId === 'revenue')!;
    expect(summary.outliers).toContain(100000);
  });

  it('parses formatted numeric strings', () => {
    const formatted = [{ product: 'W', revenue: '$1,250.50', units: 1 }];
    const summary = new DataAnalysisService(analysisApi(formatted)).analyze().numeric.find((n) => n.colId === 'revenue')!;
    expect(summary.sum).toBeCloseTo(1250.5);
  });

  it('counts missing values', () => {
    const sparse = [{ product: 'W', revenue: 10, units: 1 }, { product: '', revenue: null, units: 2 }];
    expect(new DataAnalysisService(analysisApi(sparse)).analyze().missing).toMatchObject({ product: 1, revenue: 1 });
  });

  it('handles an empty grid without throwing', () => {
    const result = new DataAnalysisService(analysisApi([])).analyze();
    expect(result.visibleRows).toBe(0);
    expect(result.numeric).toEqual([]);
  });

  it('skips high-cardinality columns as dimensions', () => {
    // 60 unique ids: a "top 5" would be meaningless.
    const many = Array.from({ length: 60 }, (_, i) => ({ product: `p${i}`, revenue: i, units: i }));
    const dims = new DataAnalysisService(analysisApi(many)).analyze().dimensions;
    expect(dims.find((d) => d.dimensionColId === 'product')).toBeUndefined();
  });
});

/* ────────────────────────────── Diagnostics ────────────────────────────── */

function doctorApi(columns: ColumnDef[], rowCount = 10): GridApi {
  return {
    getAllColumns: () => columns,
    getAllRows: () => Array.from({ length: rowCount }, (_, i) => ({ type: 'data', nodeId: `r${i}`, data: {} })),
  } as unknown as GridApi;
}

const OK_COLUMNS: ColumnDef[] = [
  { colId: 'a', field: 'a', header: 'Alpha', type: 'string' },
  { colId: 'b', field: 'b', header: 'Beta', type: 'number' },
];

describe('grid doctor', () => {
  const run = (columns: ColumnDef[], options: Partial<GridOptions> = {}, rows = 10) =>
    new GridDoctor(doctorApi(columns, rows), { columns, ...options } as GridOptions).diagnose();

  it('finds duplicate column ids and calls them an error', () => {
    const dupes: ColumnDef[] = [
      { colId: 'a', field: 'a', header: 'A', type: 'string' },
      { colId: 'a', field: 'b', header: 'B', type: 'string' },
    ];
    const finding = run(dupes).find((d) => d.message.includes('Duplicate column ids'));
    expect(finding?.severity).toBe(DiagnosticSeverity.Error);
    expect(finding?.message).toContain('a');
  });

  it('flags auto row height as a performance cost', () => {
    expect(run(OK_COLUMNS, { rowHeightMode: 'auto' }).some((d) => d.message.includes('rowHeightMode'))).toBe(true);
  });

  it('recommends the server row model for very large client-side datasets', () => {
    expect(run(OK_COLUMNS, {}, 200_000).some((d) => d.message.includes('client-side'))).toBe(true);
  });

  it('catches a server row model with no datasource', () => {
    const finding = run(OK_COLUMNS, { rowModel: 'server' }).find((d) => d.message.includes('serverSideDatasource'));
    expect(finding?.severity).toBe(DiagnosticSeverity.Error);
  });

  it('flags conflicting width and flex, and inverted min/max', () => {
    const bad: ColumnDef[] = [
      { colId: 'a', field: 'a', header: 'A', type: 'string', width: 100, flex: 1 },
      { colId: 'b', field: 'b', header: 'B', type: 'string', minWidth: 300, maxWidth: 100 },
    ];
    const messages = run(bad).map((d) => d.message).join(' ');
    expect(messages).toContain('both width and flex');
    expect(messages).toContain('greater than maxWidth');
  });

  it('flags missing headers as an accessibility problem', () => {
    const unlabelled: ColumnDef[] = [{ colId: 'a', field: 'a', header: '', type: 'string' }];
    expect(run(unlabelled).some((d) => d.message.includes('no header text'))).toBe(true);
  });

  it('flags the deprecated theme option', () => {
    expect(run(OK_COLUMNS, { theme: 'light' } as Partial<GridOptions>).some((d) => d.message.includes('deprecated'))).toBe(true);
  });

  it('orders findings most severe first', () => {
    const bad: ColumnDef[] = [
      { colId: 'a', field: 'a', header: '', type: 'string' },
      { colId: 'a', field: 'b', header: 'B', type: 'string' },
    ];
    expect(run(bad, { rowHeightMode: 'auto' })[0].severity).toBe(DiagnosticSeverity.Error);
  });

  it('reports nothing for a clean configuration', () => {
    expect(run(OK_COLUMNS, { locale: 'en-US', rowHeight: 40 })).toEqual([]);
  });
});

/* ────────────────────────────── Dispatch ────────────────────────────── */

describe('PhotonAIAssistant routing', () => {
  const api = analysisApi(
    [{ product: 'Widget', revenue: 100, units: 10 }, { product: 'Gadget', revenue: 50, units: 5 }],
  );
  // No provider: every branch takes its deterministic offline path, which is
  // exactly what makes routing observable without mocking a network call.
  const assistant = new PhotonAIAssistant(api, { columns: ANALYSIS_COLUMNS } as GridOptions, null, null);

  it('claims documentation questions and answers with real code', async () => {
    const result = await assistant.handle('how do I use Photon Grid with React?');
    expect(result.handled).toBe(true);
    expect(result.message).toContain('PhotonGrid');
    expect(result.message).toContain('```');
  });

  it('claims generation requests and returns code', async () => {
    const columns = await assistant.handle('generate dummy columns for me');
    expect(columns.handled).toBe(true);
    expect(columns.message).toContain('ColumnDef[]');

    const data = await assistant.handle('generate a dataset of 5 rows');
    expect(data.handled).toBe(true);
    expect(data.message).toContain('export const data');
  });

  it('claims analytical questions and answers from real numbers', async () => {
    const result = await assistant.handle('what is my best selling product?');
    expect(result.handled).toBe(true);
    expect(result.message).toContain('Widget');
  });

  it('claims diagnostic questions', async () => {
    const result = await assistant.handle('why is my grid slow?');
    expect(result.handled).toBe(true);
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('declines grid commands so they fall through to the command AI', async () => {
    for (const command of ['sort by revenue descending', 'hide the units column', 'pin product left']) {
      expect((await assistant.handle(command)).handled).toBe(false);
    }
  });

  it('does not mistake a business column name for an analytical question', async () => {
    // "revenue"/"sales" name the subject, not the intent — and they are ordinary
    // column names, so a command mentioning one must still reach the command AI.
    for (const command of ['sort by revenue', 'filter sales over 100', 'group by profit']) {
      expect((await assistant.handle(command)).handled).toBe(false);
    }
  });

  it('still claims a genuine analytical question about the same column', async () => {
    // The mirror of the test above: intent words, not the noun, decide.
    expect((await assistant.handle('what is the revenue trend?')).handled).toBe(true);
    expect((await assistant.handle('summarize revenue by product')).handled).toBe(true);
  });

  it('declines questions about live grid state, which the command AI owns', async () => {
    expect((await assistant.handle('which columns are hidden?')).handled).toBe(false);
    expect((await assistant.handle('how many rows are selected?')).handled).toBe(false);
  });

  it('declines an empty prompt', async () => {
    expect((await assistant.handle('   ')).handled).toBe(false);
  });

  it('explains when analysis is impossible rather than inventing an answer', async () => {
    const textOnly = new PhotonAIAssistant(
      analysisApi([{ product: 'A' }], [{ colId: 'product', field: 'product', header: 'P', type: 'string' }]),
      { columns: [] } as unknown as GridOptions,
      null,
      null,
    );
    const result = await textOnly.handle('summarize this dataset');
    expect(result.handled).toBe(true);
    expect(result.message).toContain('numeric');
  });

  it('reports an empty grid honestly', async () => {
    const empty = new PhotonAIAssistant(analysisApi([]), { columns: ANALYSIS_COLUMNS } as GridOptions, null, null);
    expect((await empty.handle('summarize this dataset')).message).toContain('no rows');
  });
});
