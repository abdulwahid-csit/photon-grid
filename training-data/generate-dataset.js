'use strict';

/**
 * Photon AI training-dataset generator.
 *
 * Deterministically expands the ~290 canonical intents in `lib/intents.js`
 * into 50,000+ labeled training examples, split into one JSONL file per
 * category under `dataset/`. Re-running this script with no code changes
 * reproduces byte-identical output (seeded PRNG, no wall-clock/host
 * randomness) — that's what makes "regenerate the dataset" a safe, reviewable
 * operation instead of a one-off snapshot.
 *
 * Usage: `node training-data/generate-dataset.js`
 */

const fs = require('fs');
const path = require('path');

const { ENTITY_TYPES, ENTITY_TYPE_NAMES, mulberry32, pick } = require('./lib/entities');
const { wrap, contextualize, WRAP_KIND_CYCLE } = require('./lib/phrasing');
const { INTENTS } = require('./lib/intents');

const SEED = 20260702;
const rand = mulberry32(SEED);

const OUTPUT_DIR = path.join(__dirname, 'dataset');
const MAX_PER_INTENT = 200;
const WORKFLOW_COUNT = 3000;
const CONVERSATION_COUNT = 800;

const intentsByKey = Object.fromEntries(INTENTS.map((i) => [i.key, i]));

/** Fills `{verb}` and every `{slotName}` placeholder in a template with the given values. */
function renderTemplate(template, verb, slotValues) {
  let text = verb ? template.split('{verb}').join(verb) : template;
  for (const [name, value] of Object.entries(slotValues)) {
    text = text.split(`{${name}}`).join(value);
  }
  return text.replace(/\s+/g, ' ').trim();
}

function sampleSlotValues(intentDef, randFn) {
  const values = {};
  for (const s of intentDef.slots) values[s.name] = pick(randFn, ENTITY_TYPES[s.type]);
  return values;
}

const CONFIDENCE_RANGES = {
  'single-step': [0.9, 0.99],
  conversational: [0.75, 0.92],
  typo: [0.55, 0.78],
  contextual: [0.65, 0.85],
  ambiguous: [0.25, 0.45],
  'multi-step': [0.7, 0.92],
};

function computeConfidence(randFn, variantType) {
  const [lo, hi] = CONFIDENCE_RANGES[variantType] || [0.7, 0.9];
  return Math.round((lo + randFn() * (hi - lo)) * 100) / 100;
}

/** One deterministic, canonical rendering of an intent — used to build stable `follow_up` examples. */
function canonicalRendering(intentDef) {
  const slotValues = {};
  for (const s of intentDef.slots) slotValues[s.name] = ENTITY_TYPES[s.type][0];
  const verb = intentDef.verbs.length ? intentDef.verbs[0] : '';
  const utterance = renderTemplate(intentDef.templates[0], verb, slotValues);
  const parameters = intentDef.params(slotValues);
  return { utterance, intent: intentDef.key, expected_output: { type: intentDef.commandType, params: parameters } };
}

function buildFollowUp(intentDef) {
  if (!intentDef.followUpKey) return null;
  const target = intentsByKey[intentDef.followUpKey];
  if (!target) return null;
  return canonicalRendering(target);
}

/** Generates `count` unique (deduped) example rows for one canonical intent. */
function generateForIntent(intentDef, count, randFn) {
  const examples = [];
  const seenText = new Set();
  const followUp = buildFollowUp(intentDef);
  let attempts = 0;
  const maxAttempts = count * 50;

  while (examples.length < count && attempts < maxAttempts) {
    attempts++;
    const template = pick(randFn, intentDef.templates);
    const verb = intentDef.verbs.length ? pick(randFn, intentDef.verbs) : '';
    const slotValues = sampleSlotValues(intentDef, randFn);
    const base = renderTemplate(template, verb, slotValues);

    let text = null;
    let variantType = null;
    let expectedOutputOverride = null;
    let paramsOverride = null;
    const roll = randFn();

    if (roll < 0.04 && intentDef.slots.length >= 1) {
      const pronoun = pick(randFn, ['it', 'that', 'this one']);
      text = verb ? `${verb} ${pronoun}` : `do that to ${pronoun}`;
      variantType = 'ambiguous';
      const missing = intentDef.slots.map((s) => s.name);
      paramsOverride = {};
      expectedOutputOverride = {
        type: 'clarificationRequest',
        params: { intent: intentDef.key, missing },
        message: `Which ${intentDef.slots[0].name} did you mean?`,
      };
    } else if (roll < 0.1 && intentDef.slots.length === 1) {
      const literal = slotValues[intentDef.slots[0].name];
      const contextualized = contextualize(base, literal, randFn);
      if (contextualized) {
        text = contextualized;
        variantType = 'contextual';
      }
    }

    if (!text) {
      const kind = WRAP_KIND_CYCLE[attempts % WRAP_KIND_CYCLE.length];
      const wrapped = wrap(base, kind, randFn);
      text = wrapped.text;
      variantType = wrapped.variantType;
    }

    text = text.trim();
    const normalized = text.toLowerCase();
    if (!text || seenText.has(normalized)) continue;
    seenText.add(normalized);

    // Ambiguous utterances never mention the slot value in text (that's the whole point — it
    // was dropped in favor of a pronoun), so nothing was actually extracted from them.
    const entities = variantType === 'ambiguous'
      ? []
      : intentDef.slots.map((s) => ({ type: s.type, name: s.name, value: slotValues[s.name] }));
    const parameters = paramsOverride !== null ? paramsOverride : intentDef.params(slotValues);
    const expectedOutput = expectedOutputOverride || { type: intentDef.commandType, params: parameters };

    examples.push({
      status: intentDef.status,
      utterance: text,
      variantType,
      entities,
      parameters,
      expected_output: expectedOutput,
      confidence: computeConfidence(randFn, variantType),
      synonyms: intentDef.synonyms,
      follow_up: followUp,
    });
  }
  return examples;
}

function targetCountFor(_intentDef, randFn) {
  const lo = 155;
  return lo + Math.floor(randFn() * (MAX_PER_INTENT - lo + 1)); // [155, 200], biased toward the top of the 50-200 range
}

// ─── Workflows: compound single-utterance, multi-step commands ────────────
function renderOneForWorkflow(intentDef, randFn) {
  const template = pick(randFn, intentDef.templates);
  const verb = intentDef.verbs.length ? pick(randFn, intentDef.verbs) : '';
  const slotValues = sampleSlotValues(intentDef, randFn);
  const text = renderTemplate(template, verb, slotValues);
  const parameters = intentDef.params(slotValues);
  return { text, parameters };
}

const WORKFLOW_CONNECTORS = [' and ', ' and then ', ', then ', '. also, ', ' then ', ', and also '];

function buildWorkflows(randFn, count) {
  const eligible = INTENTS.filter((i) => i.category !== 'ai-panel');
  const results = [];
  const seen = new Set();
  let attempts = 0;
  while (results.length < count && attempts < count * 30) {
    attempts++;
    const a = pick(randFn, eligible);
    const b = pick(randFn, eligible);
    if (a.key === b.key) continue;
    const ra = renderOneForWorkflow(a, randFn);
    const rb = renderOneForWorkflow(b, randFn);
    const connector = pick(randFn, WORKFLOW_CONNECTORS);
    const utterance = `${ra.text}${connector}${rb.text}`.replace(/\s+/g, ' ').trim();
    const normalized = utterance.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    results.push({
      id: `workflows.${String(results.length).padStart(6, '0')}`,
      category: 'workflows',
      intent: 'compound',
      status: a.status === 'implemented' && b.status === 'implemented' ? 'implemented' : 'planned',
      utterance,
      variantType: 'multi-step',
      steps: [
        { intent: a.key, parameters: ra.parameters, expected_output: { type: a.commandType, params: ra.parameters } },
        { intent: b.key, parameters: rb.parameters, expected_output: { type: b.commandType, params: rb.parameters } },
      ],
      confidence: computeConfidence(randFn, 'multi-step'),
      synonyms: [],
      follow_up: null,
    });
  }
  return results;
}

// ─── Conversations: multi-turn dialogues (greeting, clarification, error-recovery) ─
function turnFor(intentDef, randFn) {
  const r = renderOneForWorkflow(intentDef, randFn);
  return { role: 'user', utterance: r.text, intent: intentDef.key, expected_output: { type: intentDef.commandType, params: r.parameters } };
}

function buildClarificationConversation(randFn, idx) {
  const candidates = INTENTS.filter((i) => i.slots.length >= 1);
  const intentDef = pick(randFn, candidates);
  const missingNames = intentDef.slots.map((s) => s.name);
  const verb = intentDef.verbs.length ? pick(randFn, intentDef.verbs) : intentDef.templates[0].split(' ')[0];
  const ambiguousUtterance = verb ? `${verb} it` : 'do that';
  const clarifyingQuestion = missingNames.length === 1
    ? `Which ${missingNames[0]} did you mean?`
    : `Which ${missingNames.slice(0, -1).join(', ')} and ${missingNames[missingNames.length - 1]} did you mean?`;
  const slotValues = sampleSlotValues(intentDef, randFn);
  // The user's clarifying reply supplies every missing slot at once (e.g. "Discount, number"),
  // since the assistant asked about all of them together above.
  const clarifyingReply = intentDef.slots.map((s) => slotValues[s.name]).join(', ');
  const resolvedUtterance = renderTemplate(pick(randFn, intentDef.templates), verb, slotValues);
  const parameters = intentDef.params(slotValues);
  return {
    id: `conversations.clarification.${String(idx).padStart(6, '0')}`,
    category: 'conversations',
    kind: 'clarification',
    turns: [
      { role: 'user', utterance: ambiguousUtterance, intent: intentDef.key, expected_output: { type: 'clarificationRequest', params: { intent: intentDef.key, missing: missingNames } } },
      { role: 'assistant', message: clarifyingQuestion },
      { role: 'user', utterance: clarifyingReply, intent: intentDef.key, expected_output: { type: intentDef.commandType, params: parameters } },
      { role: 'assistant', message: `Done — ${resolvedUtterance}.` },
    ],
  };
}

function buildErrorRecoveryConversation(randFn, idx) {
  const troubleIntents = INTENTS.filter((i) => i.category === 'troubleshooting');
  const trouble = pick(randFn, troubleIntents);
  const phrase = trouble.description.replace(/^Helps diagnose: /, '').replace(/\.$/, '');
  const fixIntentKey = trouble.followUpKey && intentsByKey[trouble.followUpKey] ? trouble.followUpKey : 'listAICapabilities';
  const fixIntent = intentsByKey[fixIntentKey];
  const fixTurn = turnFor(fixIntent, randFn);
  return {
    id: `conversations.error-recovery.${String(idx).padStart(6, '0')}`,
    category: 'conversations',
    kind: 'error-recovery',
    turns: [
      { role: 'user', utterance: pick(randFn, trouble.templates), intent: trouble.key, expected_output: { type: 'diagnose', params: { symptom: phrase } } },
      { role: 'assistant', message: `Let's check a few things — "${phrase}" usually comes down to a missing flag or an unapplied setting. Want me to try fixing it directly?` },
      fixTurn,
      { role: 'assistant', message: 'Fixed — let me know if that resolved it.' },
    ],
  };
}

function buildGreetingCommandConversation(randFn, idx) {
  const candidates = INTENTS.filter((i) => i.status === 'implemented' && i.category !== 'ai-panel');
  const first = pick(randFn, candidates);
  const second = intentsByKey[first.followUpKey] || pick(randFn, candidates);
  const t1 = turnFor(first, randFn);
  const t2 = turnFor(second, randFn);
  return {
    id: `conversations.greeting-command.${String(idx).padStart(6, '0')}`,
    category: 'conversations',
    kind: 'greeting-command',
    turns: [
      { role: 'user', utterance: pick(randFn, ['hi', 'hello', 'hey there']), intent: 'greetAI', expected_output: { type: 'greetAI', params: {} } },
      { role: 'assistant', message: "Hi! Tell me what to do — sort, filter, pin, group, hide/show columns, move columns, selection, and more." },
      t1,
      { role: 'assistant', message: 'Done.' },
      t2,
      { role: 'assistant', message: 'Done.' },
    ],
  };
}

function buildMultiCommandConversation(randFn, idx) {
  const candidates = INTENTS.filter((i) => i.category !== 'ai-panel');
  const steps = [pick(randFn, candidates), pick(randFn, candidates), pick(randFn, candidates)];
  const turns = [];
  for (const s of steps) turns.push(turnFor(s, randFn), { role: 'assistant', message: 'Done.' });
  return {
    id: `conversations.multi-command.${String(idx).padStart(6, '0')}`,
    category: 'conversations',
    kind: 'multi-command',
    turns,
  };
}

function buildConversations(randFn, count) {
  const builders = [buildClarificationConversation, buildErrorRecoveryConversation, buildGreetingCommandConversation, buildMultiCommandConversation];
  const results = [];
  for (let i = 0; i < count; i++) {
    const builder = builders[i % builders.length];
    results.push(builder(randFn, i));
  }
  return results;
}

// ─── Write helpers ──────────────────────────────────────────────────────
function writeJsonl(filePath, rows) {
  const lines = rows.map((r) => JSON.stringify(r));
  fs.writeFileSync(filePath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
}

// ─── Main ───────────────────────────────────────────────────────────────
function main() {
  if (ENTITY_TYPE_NAMES.length < 100) {
    throw new Error(`Expected 100+ entity types, found ${ENTITY_TYPE_NAMES.length}`);
  }
  if (INTENTS.length < 250 || INTENTS.length > 500) {
    throw new Error(`Expected 250-500 canonical intents, found ${INTENTS.length}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const byCategory = new Map();
  const manifest = { seed: SEED, entityTypeCount: ENTITY_TYPE_NAMES.length, intentCount: INTENTS.length, categories: {}, totalExamples: 0 };
  const globalSeenUtterances = new Set();

  for (const intentDef of INTENTS) {
    const target = targetCountFor(intentDef, rand);
    const raw = generateForIntent(intentDef, target, rand);

    const rows = [];
    for (const ex of raw) {
      const norm = ex.utterance.toLowerCase();
      if (globalSeenUtterances.has(norm)) continue; // guarantee no duplicate utterances across the ENTIRE dataset
      globalSeenUtterances.add(norm);
      rows.push({
        id: `${intentDef.category}.${intentDef.key}.${String(rows.length).padStart(6, '0')}`,
        category: intentDef.category,
        intent: intentDef.key,
        status: ex.status,
        utterance: ex.utterance,
        variantType: ex.variantType,
        entities: ex.entities,
        parameters: ex.parameters,
        expected_output: ex.expected_output,
        confidence: ex.confidence,
        synonyms: ex.synonyms,
        follow_up: ex.follow_up,
      });
    }

    if (!byCategory.has(intentDef.category)) byCategory.set(intentDef.category, []);
    byCategory.get(intentDef.category).push(...rows);
  }

  for (const [category, rows] of byCategory) {
    writeJsonl(path.join(OUTPUT_DIR, `${category}.jsonl`), rows);
    manifest.categories[category] = (manifest.categories[category] || 0) + rows.length;
    manifest.totalExamples += rows.length;
  }

  const workflows = buildWorkflows(rand, WORKFLOW_COUNT);
  writeJsonl(path.join(OUTPUT_DIR, 'workflows.jsonl'), workflows);
  manifest.categories.workflows = workflows.length;
  manifest.totalExamples += workflows.length;

  const conversations = buildConversations(rand, CONVERSATION_COUNT);
  writeJsonl(path.join(OUTPUT_DIR, 'conversations.jsonl'), conversations);
  manifest.categories.conversations = conversations.length;
  manifest.totalConversations = conversations.length;

  manifest.perIntentCounts = INTENTS.map((i) => ({ key: i.key, category: i.category, status: i.status })).length;
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Wrote ${manifest.totalExamples} labeled examples + ${conversations.length} conversations across ${byCategory.size + 2} files.`);
  console.log(`Entity types: ${manifest.entityTypeCount}, Canonical intents: ${manifest.intentCount}`);
}

main();
