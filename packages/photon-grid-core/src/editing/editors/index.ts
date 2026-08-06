/**
 * The editors Photon Grid ships with.
 *
 * Fifteen controls covering the column types a grid actually meets, each a thin
 * layer over a native element so the platform keeps contributing its keyboard,
 * its mobile behaviour, its pickers and its accessibility — and each replaceable,
 * because every one of them is registered through exactly the same call an
 * application's own editor would use.
 *
 * @packageDocumentation
 */

import type { BuiltInEditorName, CellEditorConstructor } from '../types/cell-editor.types';

import { AutocompleteEditor } from './autocomplete-editor';
import { CheckboxEditor } from './checkbox-editor';
import { ColorEditor } from './color-editor';
import { DateEditor } from './date-editor';
import { DatetimeEditor } from './datetime-editor';
import { EmailEditor } from './email-editor';
import { NumberEditor } from './number-editor';
import { PasswordEditor } from './password-editor';
import { RangeEditor } from './range-editor';
import { SelectEditor } from './select-editor';
import { SwitchEditor } from './switch-editor';
import { TextEditor } from './text-editor';
import { TextareaEditor } from './textarea-editor';
import { TimeEditor } from './time-editor';
import { UrlEditor } from './url-editor';

// ─── Base classes ─────────────────────────────────────────────────────────────

export { AbstractCellEditor, type EditorParams } from './base/abstract-editor';
export { InputCellEditor, NATIVE_PICKER_CLASS, showNativePicker } from './base/input-editor';

// ─── Editors ──────────────────────────────────────────────────────────────────

export { AutocompleteEditor };
export type {
  AutocompleteEditorParams,
  AutocompleteOptionsContext,
} from './autocomplete-editor';

export { CheckboxEditor };
export type { CheckboxEditorParams } from './checkbox-editor';

export { ColorEditor };
export type { ColorEditorParams, ColorOutputFormat } from './color-editor';

export { DateEditor };
export type { DateEditorParams } from './date-editor';

export { DatetimeEditor };
export type { DatetimeEditorParams } from './datetime-editor';

export { EmailEditor };
export type { EmailEditorParams } from './email-editor';

export { NumberEditor };
export type { NumberEditorParams } from './number-editor';

export { PasswordEditor };
export type { PasswordEditorParams } from './password-editor';

export { RangeEditor };
export type { RangeEditorParams } from './range-editor';

export { SelectEditor };
export type { SelectEditorParams, SelectOptionsContext } from './select-editor';

export { SwitchEditor };
export type { SwitchEditorParams } from './switch-editor';

export { TextEditor };
export type { TextEditorParams } from './text-editor';

export { TextareaEditor };
export type { TextareaEditorParams } from './textarea-editor';

export { TimeEditor };
export type { TimeEditorParams } from './time-editor';

export { UrlEditor };
export type { UrlEditorParams } from './url-editor';

// ─── Default registration ─────────────────────────────────────────────────────

/**
 * Every editor Photon Grid ships, keyed by the name a column selects it with.
 *
 * ### On tree-shaking
 * A function rather than a module-scope constant, mirroring
 * `createDefaultRenderers`: a consumer who seeds an {@link EditorRegistry} with
 * their own map never references this, so nothing here is retained. Be equally
 * clear about the limit of that seam — the registry the grid itself edits
 * through is constructed eagerly with the full set, so any bundle containing the
 * editing system contains all fifteen. The saving is real for a custom
 * embedding; it is not one the default build gets for free.
 *
 * ### On the cast
 * A registry entry is a `CellEditorConstructor`, whose value and params types are
 * the fully general `unknown` / `Record<string, unknown>`. Each editor narrows
 * both, and `CellEditorParams` mentions `TValue` in a callback parameter
 * (`onValueChange`), so under `strictFunctionTypes` no variance rule lets
 * `NumberEditor` stand in for the general shape at compile time — even though
 * the substitution is exactly what the grid does, and is sound: an editor is
 * only ever handed the params of a column that selected it. The `satisfies`
 * clause keeps what matters checkable — every `BuiltInEditorName` is present,
 * and nothing else is — and the widening is asserted once, here, instead of at
 * fifteen call sites.
 *
 * @returns A fresh, frozen map. Frozen because the returned object is the
 *   default *definition* of the built-in set; an application customises by
 *   registering over the top of it, not by mutating it out from under another
 *   grid on the page.
 */
export function createDefaultEditors(): Readonly<Record<BuiltInEditorName, CellEditorConstructor>> {
  const editors = {
    text: TextEditor,
    textarea: TextareaEditor,
    number: NumberEditor,
    email: EmailEditor,
    password: PasswordEditor,
    url: UrlEditor,
    checkbox: CheckboxEditor,
    switch: SwitchEditor,
    select: SelectEditor,
    autocomplete: AutocompleteEditor,
    date: DateEditor,
    datetime: DatetimeEditor,
    time: TimeEditor,
    color: ColorEditor,
    range: RangeEditor,
  } satisfies Record<BuiltInEditorName, new () => unknown>;

  return Object.freeze(editors) as unknown as Readonly<
    Record<BuiltInEditorName, CellEditorConstructor>
  >;
}
