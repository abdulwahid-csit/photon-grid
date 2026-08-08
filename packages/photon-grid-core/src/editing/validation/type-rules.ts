/**
 * Validation a column gets for free from its declared type.
 *
 * This is the module behind "`type: 'email'` should reject `nope` without me
 * configuring anything". A column's type is already a statement about the shape
 * of its data; restating it as `validation: { email: true }` is duplication the
 * author should never have to write, and duplication they will eventually get
 * wrong.
 *
 * ### Why a data map and not a `switch`
 * The mapping is data, so it is expressed as data: one frozen lookup that reads
 * as a specification, costs a single hash probe per compile, and can be read (or
 * diffed) without following control flow. A `switch` would compile to the same
 * behaviour while hiding the table it is really implementing.
 *
 * ### Implied rules are the weakest layer
 * Whatever appears here is merged **first** by {@link ValidationEngine.compile},
 * under the legacy column fields and under `colDef.validation`. A column that
 * declares `validation: { decimal: 2 }` therefore refines the implied
 * `decimal: true` rather than fighting it, and one that wants a looser rule can
 * always say so explicitly.
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDef } from '../../types/column.types';

/**
 * Shared rule sets, so the four numeric types and the three temporal types name
 * the same frozen object instead of allocating seven near-identical literals.
 */
const NUMERIC: Readonly<Record<string, unknown>> = Object.freeze({ decimal: true });
const TEMPORAL: Readonly<Record<string, unknown>> = Object.freeze({ date: true });
const FORMAT_EMAIL: Readonly<Record<string, unknown>> = Object.freeze({ email: true });
const FORMAT_URL: Readonly<Record<string, unknown>> = Object.freeze({ url: true });

/**
 * Returned for every type that implies nothing.
 *
 * A shared frozen singleton because this is the overwhelmingly common answer —
 * spreading it during a compile must not cost an allocation, and returning a
 * fresh `{}` per call would.
 */
const NO_IMPLIED_VALIDATION: Readonly<Record<string, unknown>> = Object.freeze({});

/**
 * The rules each column type implies, keyed by {@link ColumnDataType}.
 *
 * | Type                                      | Implied rule     |
 * |-------------------------------------------|------------------|
 * | `email`                                   | `email: true`    |
 * | `url`                                     | `url: true`      |
 * | `number`, `currency`, `percentage`, `duration` | `decimal: true` |
 * | `date`, `datetime`, `time`                | `date: true`     |
 *
 * Types absent from the table imply nothing, deliberately. `boolean`, `array`,
 * `object`, `dropdown` and friends have no single rule that is right for every
 * column of that type, and a wrong implied rule is far worse than none: it
 * blocks a commit the author never asked to have blocked.
 *
 * `Partial` rather than a total `Record` so a new `ColumnDataType` does not
 * force an entry here; absence is a valid and meaningful answer.
 */
export const TYPE_IMPLIED_VALIDATION: Readonly<
  Partial<Record<ColumnDataType, Readonly<Record<string, unknown>>>>
> = Object.freeze({
  email: FORMAT_EMAIL,
  url: FORMAT_URL,
  number: NUMERIC,
  currency: NUMERIC,
  percentage: NUMERIC,
  duration: NUMERIC,
  date: TEMPORAL,
  datetime: TEMPORAL,
  time: TEMPORAL,
});

/**
 * The rules `colDef` inherits from its type.
 *
 * @param colDef - The column being compiled.
 * @returns A frozen rule record — never `undefined`, so callers can spread the
 *   result unconditionally instead of guarding every merge site.
 */
export function impliedValidationFor(colDef: ColumnDef): Readonly<Record<string, unknown>> {
  return TYPE_IMPLIED_VALIDATION[colDef.type] ?? NO_IMPLIED_VALIDATION;
}
