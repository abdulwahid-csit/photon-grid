# Photon Grid — Formula Engine

An enterprise-grade, **zero-dependency**, framework-independent formula engine for
Photon Grid. It parses and evaluates Excel/Sheets-style formulas (`=SUM(A1:A10)`,
`=IF(A1>5,"Yes","No")`, `=VLOOKUP(...)`), maintains a dependency graph, and
recomputes **only** the cells affected by a change — scaling to hundreds of
thousands of formula cells without full-grid recalculation.

No external formula libraries are used (no HyperFormula, no FormulaJS); every
subsystem is implemented from scratch.

---

## Table of contents

1. [Quick start](#quick-start)
2. [Architecture](#architecture)
3. [The pipeline](#the-pipeline)
4. [Cell identity & the addressing contract](#cell-identity--the-addressing-contract)
5. [Supported syntax](#supported-syntax)
6. [Function library](#function-library)
7. [Errors](#errors)
8. [Configuration](#configuration)
9. [Public API](#public-api)
10. [Extensibility](#extensibility)
11. [Performance](#performance)
12. [Testing](#testing)

---

## Quick start

Enable the engine in `GridOptions` and opt columns in with `allowFormula`:

```ts
import { GridCore } from 'photon-grid-core';

const grid = new GridCore(container, {
  columns: [
    { field: 'qty' },
    { field: 'price' },
    { field: 'total', allowFormula: true }, // formulas allowed here
  ],
  data: [{ qty: 3, price: 10, total: null }],
  formula: { enabled: true },
});

// Type `=A1*B1` into a `total` cell — or set it programmatically:
grid.api.setCellFormula('row-0', 'total', '=A1*B1'); // total displays 30
```

- **Editing** a formula cell shows its source (`=A1*B1`); **viewing** shows the
  evaluated result.
- Filling/copying a formula offsets its relative references (`=A1*B1` → `=A2*B2`).
- Everything stays correct across sort, filter, pagination and virtual scrolling.

---

## Declaring formulas (three ways)

Formulas can be supplied three ways; you never have to call `setCellFormula` just
to seed them. Precedence, **lowest → highest**: column formula → row-data formula
→ runtime API / manual edit (last write wins).

**1. Column formula** — one formula, applied to every row of the column:

```ts
const grid = new GridCore(container, {
  columns: [
    { field: 'quantity' },
    { field: 'unitPrice' },
    { field: 'total',      type: 'currency', formula: '=quantity * unitPrice' },
    { field: 'taxRate' },
    { field: 'grandTotal', type: 'currency', formula: '=total * (1 + taxRate)' },
  ],
  data: [{ quantity: 12, unitPrice: 25, taxRate: 0.08 }],
  formula: { enabled: true },
});
// `total` = 300 and `grandTotal` = 324 on every row — no API call.
```

Declaring `formula` implicitly sets `allowFormula: true` on that column.

**2. Row-data formula** — a `=`-prefixed value embedded in a row overrides the
column formula for that one row:

```ts
data: [
  { quantity: 12, unitPrice: 25, taxRate: 0.08 },                    // uses column formula
  { quantity: 7,  unitPrice: 89, taxRate: 0.08, total: '=quantity * unitPrice * 0.9' }, // per-row override
  { product: 'TOTAL', total: '=SUM(D1:D8)', grandTotal: '=SUM(F1:F8)' }, // aggregate row
]
```

By default, a `=`-value auto-opts its column into the engine even without
`allowFormula`. Disable with `formula: { enabled: true, autoDetectDataFormulas: false }`.

**3. Runtime API** — unchanged, and always wins:

```ts
grid.api.setCellFormula(nodeId, 'total', '=quantity * unitPrice * 1.2');
```

Declarative formulas are discovered automatically on initial load, on row
insertion (`appendData`/`applyTransaction`), on row-data updates (`updateRow`), and
purged on removal — so the dependency graph stays correct as data changes.

### Row-relative reference syntax

Declarative formulas are **row-relative**: they resolve against the row each cell
lives in. Two input syntaxes are accepted and normalized to the same internal
(stable `colId`) representation:

| Syntax | Example | Means |
|---|---|---|
| Field name | `=quantity * unitPrice` | this row's `quantity` × `unitPrice` |
| Column letter | `=B * C` | this row's column B × column C |

Resolution precedence for a bare name: **named range → column `field` → column
letter → `#NAME?`**. Absolute A1 references (`=D2`, `=SUM(D1:D8)`) keep their exact
existing meaning and may be mixed in freely.

> **Limitation:** a field whose name is A1-shaped — letters immediately followed by
> digits, e.g. `q1` or `col2` — tokenizes as an absolute cell reference and cannot
> be used as a field-name reference. Use the column-letter form for those, or rename
> the field. Names like `quantity`, `unitPrice`, `taxRate`, `total` are unaffected.

> **Not yet supported:** declarative *summary-row* formulas that aggregate a column
> by name (`=SUM(total)`). Use an explicit range in a row-data formula
> (`=SUM(D1:D8)`) or a whole-column range (`=SUM(D:D)`) instead.

---

## Architecture

Each module has a single responsibility; no file is a "God class". Business logic
lives entirely in the engine — the grid is reached only through the
`FormulaGridAdapter` **port**, so the engine has no DOM/framework dependency and
is unit-testable in isolation.

```
                              ┌────────────────────────┐
   grid edit / paste / fill   │      FormulaEngine      │  facade (DI entry point)
   ─────────────────────────▶ │  (coordinator, thin)    │
                              └───────────┬────────────┘
             ┌─────────────────┬──────────┼───────────┬──────────────────┐
             ▼                 ▼           ▼           ▼                  ▼
     ConfigurationManager  FunctionRegistry  FormulaStore  NamedRangeMgr  CalculationEngine
                                                                              │
        ┌─────────────────────────────────────────────────────────────────── │
        ▼                                                                     ▼
   compile()  ──▶  Tokenizer ──▶ Parser ──▶ AST     ExpressionCache (LRU)   DependencyGraph
        │                                    │                                  │
        ▼                                    ▼                                  ▼
   reference-extractor              Evaluator + coerce               CycleDetector (Kahn)
        │                                    │                                  │
        ▼                                    ▼                                  ▼
   ReferenceResolver ◀──────────── EvalContext ────────────▶ FormulaGridAdapter (port)
```

| Module | File | Responsibility |
|---|---|---|
| `FormulaEngine` | `formula-engine.ts` | Facade; owns subsystems, exposes the public surface |
| `Tokenizer` | `tokenizer/tokenizer.ts` | Single-pass, regex-free lexing to tokens |
| `Parser` | `parser/parser.ts` | Precedence-climbing parse to an immutable AST |
| AST | `parser/ast.types.ts` | Discriminated-union node types |
| `Evaluator` | `evaluator/evaluator.ts` | Tree-walking evaluation to a `FormulaValue` |
| coercion | `evaluator/coerce.ts` | Excel type-juggling, comparison, aggregation |
| `FunctionRegistry` | `functions/function-registry.ts` | Name → `FormulaFunction` lookup (extensible) |
| built-ins | `functions/*-functions.ts` | 55 functions, each its own class |
| `DependencyGraph` | `graph/dependency-graph.ts` | Precedent/dependent tracking (cell + range) |
| `CycleDetector` | `graph/cycle-detector.ts` | Topological order + cycle detection (Kahn) |
| `CalculationEngine` | `calc/calculation-engine.ts` | Orchestrates dirty-subgraph recompute |
| `ReferenceResolver` | `reference/reference-resolver.ts` | Positional refs ↔ stable ids & values |
| `CellReference` | `reference/cell-reference.ts` | `A1` ⇄ index conversions |
| `ExpressionCache` | `cache/expression-cache.ts` | LRU AST cache |
| `FormulaError` | `error/formula-error.ts` | Excel-style error values |
| `FormulaStore` | `store/formula-store.ts` | Map of formula cells (source/AST/value) |
| `FormulaSerializer` | `formula-serializer.ts` | AST → canonical source |
| `FormulaTransposer` | `formula-transposer.ts` | Relative-reference offsetting (copy/fill) |
| `NamedRangeManager` | `named-range-manager.ts` | Runtime named ranges |
| `ConfigurationManager` | `config/formula-config.ts` | Resolves public config → dense config |
| `GridFormulaAdapter` | `core/formula-grid-adapter-impl.ts` | Concrete port over GridStore/ColumnModel |

---

## The pipeline

**On formula entry** (`setFormula`):

```
source ─▶ ExpressionCache.compile ─▶ AST
              │
              ├─▶ extractReferences ─▶ ReferenceResolver.resolveDependencies ─▶ DependencyGraph
              ├─▶ containsVolatileFunction ─▶ volatile set
              └─▶ buildDirty (self + transitive dependents + volatiles)
                        │
                        ▼
                 CycleDetector (Kahn topo-order + cyclic set)
                        │
                        ▼
                 Evaluator over EvalContext ─▶ write changed values via adapter
```

**On a non-formula cell change** (`onCellsChanged`) — from an edit, paste, fill,
cut or undo: the same dirty-subgraph recompute runs, seeded by the changed cells'
dependents plus all volatile cells. The whole grid is never recomputed.

---

## Cell identity & the addressing contract

The dependency graph, store and caches are keyed by a **stable** `CellId` —
`` `${nodeId}::${colId}` `` — built from a row's `nodeId` (stable across
sort/filter/pagination) and an immutable `colId` (never the mutable column
index). This is what keeps formulas correct when the user sorts, filters,
paginates or scrolls.

Parsed `A1` references are **positional** against the *data model*: column index
follows the canonical column order, row index follows the original
(unsorted/unfiltered) row order. The `ReferenceResolver` maps positional
coordinates to stable identities via the adapter at resolution time, so `A1`
always means "first column of the first data row" regardless of view state.

---

## Supported syntax

**Operators** (lowest → highest precedence):

1. comparison `=` `<>` `<` `<=` `>` `>=`
2. concatenation `&`
3. addition / subtraction `+` `-`
4. multiplication / division `*` `/`
5. unary prefix `+` `-` — *binds tighter than `^`* (Excel quirk: `-2^2 = 4`)
6. exponentiation `^` (right-associative)
7. postfix percent `%`

**References**

| Kind | Examples |
|---|---|
| Single cell | `A1`, `B20`, `AA500` |
| Absolute / mixed | `$A$1`, `$A1`, `A$1` |
| Range | `A1:A10`, `A1:C10` |
| Whole column | `A:A` |
| Whole row | `1:10` |
| Sheet-qualified (parsed; multi-sheet reserved) | `Sheet1!A1` |
| Named range | `TaxRate`, `Region` |
| Row-relative field name | `quantity`, `unitPrice` |
| Row-relative column letter | `B`, `C` (no row number) |

**Literals**: numbers (`42`, `3.14`, `.5`, `2E-4`), strings (`"a""b"` escapes a
quote), booleans (`TRUE`/`FALSE`), error literals (`#N/A`).

---

## Function library

55 built-in functions, each a class implementing `FormulaFunction`:

- **Math/stats**: `SUM` `AVERAGE` `MIN` `MAX` `COUNT` `COUNTA` `ABS` `SQRT`
  `ROUND` `ROUNDUP` `ROUNDDOWN` `POWER` `RAND` `RANDBETWEEN`
- **Logical**: `IF` `IFS` `AND` `OR` `NOT` `XOR` `IFERROR` `IFNA`
- **Text**: `LEN` `LEFT` `RIGHT` `MID` `TRIM` `LOWER` `UPPER` `CONCAT`
  `CONCATENATE` `TEXTJOIN` `FIND` `SEARCH` `REPLACE` `SUBSTITUTE`
- **Information**: `ISBLANK` `ISNUMBER` `ISTEXT` `ISLOGICAL` `ISERROR` `ISERR`
  `ISNA` `NA`
- **Date/time**: `TODAY` `NOW` `YEAR` `MONTH` `DAY` (Excel serial-number model)
- **Lookup/reference**: `VLOOKUP` `HLOOKUP` `INDEX` `MATCH` `CHOOSE`

Aggregators follow Excel's **range-vs-literal rule**: numbers inside a *range*
are counted while text/blanks/booleans are ignored, but *scalar literal*
arguments are coerced — so `SUM(A1:B1)` with a text cell ignores it, while
`SUM(1,"2",TRUE)` is `4`.

`RAND`/`RANDBETWEEN`/`NOW`/`TODAY` are **volatile**: always recomputed on a
recalc pass, and they read the injected `ctx.now()`/`ctx.random()` (deterministic
under test).

---

## Errors

Evaluation **never throws** for user-facing conditions — an immutable
`FormulaError` value propagates like any other value.

| Code | Meaning |
|---|---|
| `#DIV/0!` | Division by zero |
| `#REF!` | Invalid / off-grid reference |
| `#NAME?` | Unknown function or name |
| `#VALUE!` | Wrong value type / arity |
| `#NUM!` | Invalid number (e.g. `SQRT(-1)`) |
| `#N/A` | Value not available (failed lookup) |
| `#CIRC!` | Circular reference |
| `#ERROR!` | Syntax / parse error |

Circular references are detected (not looped on) and every cell in — or downstream
of — a cycle is flagged `#CIRC!`.

---

## Configuration

```ts
formula: {
  enabled: boolean;              // master switch (default false)
  allowCircularReference: boolean;
  autoRecalculate: boolean;
  enableCaching: boolean;        // AST cache (default true)
  maxDependencyDepth: number;    // 0 = unbounded
  volatileFunctions: string[];   // extra volatile names
  locale: string;
  decimalSeparator: string;      // '.' default
  argumentSeparator: string;     // ',' default (use ';' for many locales)
  caseSensitiveFunctions: boolean;
  customFunctions: FormulaFunction[];
  namedRanges: Record<string, string>; // name → A1 target
}
```

Separators are part of the compile-cache key, so switching locale never returns a
stale parse.

---

## Public API

On `grid.api`:

```ts
setCellFormula(nodeId, colId, source): void
getCellFormula(nodeId, colId): string | null
hasCellFormula(nodeId, colId): boolean
clearCellFormula(nodeId, colId): boolean
recalculateFormulas(force?): void
setNamedRange(name, target): void
removeNamedRange(name): void
getFormulaFunctionNames(): string[]
```

On `FormulaEngine` (advanced/embedding):

```ts
setFormula / getFormula / hasFormula / clearFormula
onCellsChanged(changes) / recalculate(force)
registerFunction(fn) / getRegistry()
transposeFormula(source, { deltaRow, deltaCol })   // copy/fill
setNamedRange / removeNamedRange / getNamedRanges
getState() / setState(state)                        // serialization
configure(patch) / getConfig()
```

---

## Extensibility

Register a custom function through the same contract as the built-ins
(last-wins, so you can override a built-in):

```ts
import { FormulaFunction, FunctionCategory } from 'photon-grid-core';

class TaxFunction implements FormulaFunction {
  readonly name = 'TAX';
  readonly category = FunctionCategory.Math;
  readonly minArgs = 1;
  readonly maxArgs = 2;
  evaluate(args, ctx) {
    // args are evaluated (scalars or range matrices); return a FormulaValue
    // or a FormulaError — never throw.
    ...
  }
}

grid.api /* … */; // via options.formula.customFunctions: [new TaxFunction()]
```

Other extension points: custom reference resolution (implement
`FormulaGridAdapter`), named ranges, and the injected `FormulaClock` for
deterministic volatile functions.

---

## Performance

- **Incremental recalculation** — a change dirties only its transitive
  dependents; recompute is `O(dirty)`, not `O(sheet)`.
- **Non-expanding range dependencies** — `=SUM(A:A)` costs `O(1)` memory, not
  `O(rowCount)`; a changed cell tests region containment.
- **Incremental volatile tracking** — volatile cells live in a `Set`, so gathering
  them is `O(volatile)`, not an `O(store)` scan (this fix took a 50k-formula build
  from 12.6 s → 2.0 s).
- **AST cache** — identical sources compile once (LRU-bounded).

Measured (see `tests/formula/benchmark.test.ts`):

| Scenario | Result |
|---|---|
| Build 50,000 independent formulas | ~2.0 s |
| Recalc 1 cell among 50,000 | **0.33 ms** |
| Propagate a 5,000-deep chain | ~60 ms |
| Fill 20,000 identical-source formulas (cached) | ~0.32 s |

---

## Testing

The engine is covered by **102 unit tests** in `tests/formula/` (run with
`npm test`), spanning:

- `tokenizer.test.ts` — lexing (numbers, strings, refs, operators, errors)
- `parser.test.ts` — precedence, associativity, ranges, error handling
- `evaluator.test.ts` — operators, coercion, all function families
- `calculation-engine.test.ts` — incremental recompute, chains, ranges, cycles,
  clear, volatile, serialization
- `serializer-transposer.test.ts` — round-trip + relative-reference offsetting
- `expression-cache.test.ts` — LRU behavior, separator keying
- `benchmark.test.ts` — scalability guards

Because the engine depends only on the `FormulaGridAdapter` port, every suite runs
against a tiny in-memory adapter with no DOM.
