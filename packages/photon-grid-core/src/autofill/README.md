# AutoFill Engine

Intelligent drag-to-fill for Photon Grid. Dragging the fill handle **continues a
pattern** instead of merely copying values — matching the behavior of Excel and
Google Sheets.

```
1  2  3   →  4  5  6        Jan  Feb  →  Mar  Apr
10 20 30  →  40 50 60       Mon  Tue  →  Wed  Thu
INV-001   →  INV-002        A    B    →  C    D
```

## Architecture

The engine is a **pure, framework-independent module**. It knows nothing about
`GridStore`, the DOM, rows or columns — it operates on arrays of primitive cell
values and returns generated values. The grid's fill handle (in
`cell-selection/cell-selection-engine.ts`) is the only integration point: it
collects each fill vector's source values, calls the engine, and writes the
results back through its existing undo/formula/render machinery.

```
Fill handle drag
      │  source values per vector (column slice / row slice)
      ▼
AutoFillEngine.generateSeries(source, count, { columnType, reverse, locale })
      │
      ▼
AutoFillDetectorRegistry.resolve()   ── first matching detector wins ──▶ AutoFillSeries
      │
      ▼  series.valueAt(position)   (O(1), position = source-relative index)
generated values  ──▶  grid transaction + render
```

### Position model

Every detector describes an infinite series addressed by a **source-relative
position**: `0 … length-1` are the source cells, `position >= length`
extrapolates forward (down/right fill), and `position < 0` extrapolates backward
(up/left fill). One addressing scheme handles both directions, and the copy
fallback reproduces the grid's historical cyclic fill via a true modulo.

## Detectors (priority order)

| Detector | Recognizes | Example |
| --- | --- | --- |
| `DateSequenceDetector` | constant day/week/month/year delta | `2024-01-01, 2024-01-02 → 2024-01-03` |
| `MonthDetector` | month names, full/abbrev, localized | `January, February → March` |
| `WeekdayDetector` | weekday names, full/abbrev, localized | `Mon, Tue → Wed` |
| `NumericSequenceDetector` | arithmetic progression (int/decimal/neg) | `2, 4, 6 → 8, 10` |
| `TextNumberDetector` | prefix + number + suffix, leading zeros | `Item001 → Item002` |
| `BooleanDetector` | `TRUE`/`FALSE` (any casing) | `TRUE, FALSE → TRUE, FALSE` |
| `AlphabetDetector` | single-letter sequence | `A, B, C → D` |
| `CopyDetector` | fallback — always matches | `Apple → Apple, Apple` |

Formula cells are **not** handled here — the fill handle transposes their
relative references through the Formula Engine bridge before this engine is ever
consulted.

## Extending

Implement `AutoFillPatternDetector` and pass it to `AutoFillDetectorRegistry`
(or `createDefaultDetectors()` + your own). No existing code changes.

```ts
class RomanNumeralDetector implements AutoFillPatternDetector {
  readonly name = /* your AutoFillDetectorName */;
  detect(source, ctx): AutoFillSeries | null { /* … */ }
}
```

## Configuration

Via `GridOptions.autofill` (`AutoFillConfig`):

```ts
{
  autofill: {
    enabled: true,          // false → plain copy/cycle (handle still works)
    locale: 'en-US',        // month/weekday name locale
    detectors: [/* subset of AutoFillDetectorName */],
  }
}
```

## Public API

`api.fill({ source, direction })` runs a programmatic fill; the drag handle uses
the same engine internally.
