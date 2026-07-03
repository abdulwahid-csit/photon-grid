# Photon AI Training Dataset

A generated, versioned training dataset for Photon AI's natural-language
command layer — intent recognition, entity/parameter extraction, and action
execution — covering the full data-grid feature surface (sorting, filtering,
grouping, pivoting, aggregation, charts, editing, clipboard, import/export,
selection, virtualization, tree data, pagination, themes, layouts, keyboard,
mouse, context menus, tool panels, status bar, the AI panel itself, developer
APIs, state management, performance, accessibility, and troubleshooting).

## Regenerating

```
node training-data/generate-dataset.js
```

This is a **deterministic** generator (seeded PRNG, no wall-clock or host
randomness) — re-running it with unchanged source files reproduces
byte-identical output. Edit `lib/intents.js` (the canonical intent taxonomy)
or `lib/entities.js` (the entity-value pools) and re-run to regenerate.

## Files

```
training-data/
  lib/
    entities.js     126 entity types + their sample value pools, plus the seeded PRNG
    phrasing.js      Shared politeness/casual/question/typo variation engine
    intents.js       293 canonical intents (the taxonomy — the actual content)
  generate-dataset.js  Orchestrator: expands intents -> examples -> JSONL
  dataset/
    <category>.jsonl  One file per feature category (29 categories)
    workflows.jsonl    Compound, single-utterance multi-step commands
    conversations.jsonl  Multi-turn dialogues (greeting, clarification, error-recovery)
  manifest.json      Per-category counts + generation metadata (seed, totals)
```

## Scale

- **293 canonical intents** across **29 categories**
- **126 entity types** (columns, filters, operators, directions, colors,
  charts, exports, clipboard, grouping, pivot, aggregation, editing,
  virtualization, pagination, AI commands, menus, toolbars, keyboard
  shortcuts, themes, layouts, and more — see `lib/entities.js` for the full
  registry)
- **50-200 unique utterances per intent** (enforced at generation time)
- **53,968 labeled single/multi-step examples** + **3,000 compound
  workflow examples** + **800 multi-turn conversations** = **57,768 total
  training records**, with **zero duplicate utterances** anywhere in the
  dataset (deduped globally, not just per-intent)

## The `implemented` vs `planned` status flag

Every example carries `"status": "implemented"` or `"status": "planned"`.

- **`implemented`** — the intent maps to a `PhotonCommand` type that
  genuinely exists in `src/photon-ai/builtins/*.commands.ts` today and can
  be replayed against a live `GridApi`. There are 37 of these (sort, filter,
  pin, hide/show, move, select, group, and the info/help Q&A intents).
- **`planned`** — the grid *engine* usually already exists (e.g.
  `chart-engine.ts`, `export-engine.ts`, `pagination-engine.ts`,
  `aggregation-engine.ts`, `clipboard-engine.ts`) but Photon AI has no
  natural-language command wired to it yet. These are a forward-looking spec
  for extending `PhotonAIService`'s registry — not a claim that they work
  today. **Don't treat a `planned` example as ground truth for testing the
  current build**; use the `implemented` subset for that.

Filter every category file on `status` to get either subset:

```
grep '"status": "implemented"' training-data/dataset/*.jsonl
```

## Record schema (per-intent category files)

```jsonc
{
  "id": "filtering.filterEquals.000005",   // "<category>.<intent>.<zero-padded index>"
  "category": "filtering",
  "intent": "filterEquals",                 // canonical intent key
  "status": "implemented",                  // "implemented" | "planned" — see above
  "utterance": "kindly filter Genre equal to 5",
  "variantType": "single-step",             // single-step | conversational | typo | contextual | ambiguous
  "entities": [                             // what was actually extracted from `utterance`
    { "type": "columnName", "name": "column", "value": "Genre" },
    { "type": "filterValue", "name": "filterValue", "value": "5" }
  ],
  "parameters": { "colId": "genre", "operator": "equals", "value": "5" },
  "expected_output": {                      // the PhotonCommand the executor should run
    "type": "applyFilter",
    "params": { "colId": "genre", "operator": "equals", "value": "5" }
  },
  "confidence": 0.97,                       // heuristic, scaled by variantType (see below)
  "synonyms": ["equals"],                   // interchangeable trigger words for this intent
  "follow_up": {                            // one plausible next-turn example (or null)
    "utterance": "clear all filters",
    "intent": "clearAllFilters",
    "expected_output": { "type": "clearAllFilters", "params": {} }
  }
}
```

### `variantType` and what it means for `confidence`

| variantType     | What it represents                                              | Confidence range |
|-----------------|-------------------------------------------------------------------|-------------------|
| `single-step`   | Clean, unambiguous imperative or polite phrasing                  | 0.90 - 0.99 |
| `conversational`| Casual openers ("hey, ...") or question framing ("can you ...?")  | 0.75 - 0.92 |
| `typo`          | One injected single-word typo (adjacent-swap / drop / double char)| 0.55 - 0.78 |
| `contextual`    | Refers back to an entity via pronoun ("sort **this column**")     | 0.65 - 0.85 |
| `ambiguous`     | Required slot dropped entirely ("sort **it**") — see below         | 0.25 - 0.45 |
| `multi-step`    | Compound utterance chaining two intents (`workflows.jsonl` only)  | 0.70 - 0.92 |

### Ambiguous / clarification examples

An `ambiguous` example's `entities` array is **empty** — nothing was
actually resolvable from the text — and `expected_output` is a
`clarificationRequest` instead of a real command:

```jsonc
{
  "utterance": "order that",
  "variantType": "ambiguous",
  "entities": [],
  "parameters": {},
  "expected_output": {
    "type": "clarificationRequest",
    "params": { "intent": "sortAscending", "missing": ["column"] },
    "message": "Which column did you mean?"
  },
  "confidence": 0.35
}
```

## `workflows.jsonl` schema

One utterance chaining two independent intents with a connector ("and",
"then", "also"). `status` is `implemented` only if **both** steps are.

```jsonc
{
  "id": "workflows.000010",
  "category": "workflows",
  "intent": "compound",
  "status": "planned",
  "utterance": "add Incoming as a pivot value with max and set the row id field to Priority",
  "variantType": "multi-step",
  "steps": [
    { "intent": "addPivotValueField", "parameters": { "colId": "incoming", "fn": "max" }, "expected_output": { "type": "addPivotValueField", "params": { "colId": "incoming", "fn": "max" } } },
    { "intent": "setRowIdField", "parameters": { "field": "priority" }, "expected_output": { "type": "setRowIdField", "params": { "field": "priority" } } }
  ],
  "confidence": 0.91
}
```

## `conversations.jsonl` schema

Multi-turn dialogues, four kinds cycled evenly (`kind` field):

- **`clarification`** — ambiguous request -> assistant asks which slot(s) -> user answers -> resolved command.
- **`error-recovery`** — user reports a problem (from the `troubleshooting` category) -> assistant offers to help -> a fix is attempted.
- **`greeting-command`** — small talk opener -> one command -> its natural follow-up command.
- **`multi-command`** — three independent commands run back to back in one session.

```jsonc
{
  "id": "conversations.clarification.000000",
  "category": "conversations",
  "kind": "clarification",
  "turns": [
    { "role": "user", "utterance": "use it", "intent": "setColumnEditorType", "expected_output": { "type": "clarificationRequest", "params": { "intent": "setColumnEditorType", "missing": ["column", "editorType"] } } },
    { "role": "assistant", "message": "Which column and editorType did you mean?" },
    { "role": "user", "utterance": "Discount, number", "intent": "setColumnEditorType", "expected_output": { "type": "setColumnEditorType", "params": { "colId": "discount", "editorType": "number" } } },
    { "role": "assistant", "message": "Done — edit Discount with a number input." }
  ]
}
```

## Design notes / how the volume was achieved

Hand-authoring 50,000+ distinct, correctly-labeled examples isn't reliable —
duplication and quality drift are guaranteed at that scale. Instead:

1. **`lib/intents.js`** hand-authors the actual content once per intent: a
   description, 3-8 phrase *templates* with `{slot}` placeholders, a
   `params()` function, synonyms, and a natural follow-up intent.
2. **`lib/entities.js`** supplies the value pools each slot type samples
   from (e.g. 40 column names spanning retail/HR/finance/CRM/music-inventory
   domains, so utterances don't all sound like one demo).
3. **`lib/phrasing.js`** is a generic wrapper engine — politeness
   prefixes/suffixes, casual openers, question framing, and single-word typo
   injection — applied identically to every intent, so a zero-slot global
   action ("undo the last action") still reaches 150-200 unique surface
   forms without hand-writing each one.
4. **`generate-dataset.js`** combines templates x slot fillers x wrappers,
   deduping globally (not just per intent) so the same phrasing can never
   appear twice anywhere in the dataset, and asserts the 250-500 intent
   count and 100+ entity-type count at generation time so those invariants
   can't silently drift as the taxonomy grows.

## Known limitations

- Entity spans (character offsets into `utterance`) are not included —
  entities are given as `{type, name, value}` without position, since the
  templated generation makes positional spans reconstructible but not
  load-bearing for intent-classification or command-execution training.
- `planned`-status expected outputs are a reasonable, consistent contract
  proposal (`{type, params}` shaped like the real `PhotonCommand` type) but
  have no corresponding executor in `src/photon-ai/builtins/` yet — treat
  them as a specification to implement against, not verified behavior.
- Typo injection is single-word and rule-based (adjacent-swap / drop-char /
  double-char), not a model of real human typing errors or a spellchecker
  corpus.
