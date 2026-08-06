// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { ColorEditor, type ColorEditorParams } from '../../src/editing/editors/color-editor';
import { DEFAULT_EDITOR_BY_TYPE } from '../../src/editing/registry/default-editor-resolver';
import { clearColorParseCache } from '../../src/color';
import type { EditorParams } from '../../src/editing/editors/base/abstract-editor';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

/**
 * The colour editor's contract.
 *
 * This is the editor a `type: 'color'` column opens on `Enter`, and the swatch
 * inside it is what raises the platform's colour picker on click. Two things
 * therefore have to hold, or the round trip through an edit is lossy: it must
 * *open* on the right colour whatever notation the cell stores, and it must
 * *commit* in a notation the column can live with.
 */

const COLOR_COL: ColumnDef = {
  colId: 'brand', field: 'brand', header: 'Brand colour', type: 'color', editable: true,
};

beforeEach(() => {
  clearColorParseCache();
});

/** Drives one editor session, exposing what it emitted and what it would commit. */
function session(
  value: unknown,
  params: ColorEditorParams = {},
): {
  editor: ColorEditor;
  gui: HTMLElement;
  swatch: HTMLInputElement;
  field: HTMLInputElement | null;
  emitted: Array<string | null>;
  commits: number;
} {
  const emitted: Array<string | null> = [];
  let commits = 0;

  const editor = new ColorEditor();
  editor.init({
    value,
    initialValue: value,
    data: {},
    node: { nodeId: 'r1', type: 'data', data: {}, rowIndex: 0, top: 0 } as unknown as RowNode,
    colDef: COLOR_COL,
    rowIndex: 0,
    cellElement: document.createElement('div'),
    params,
    api: null,
    trigger: 'key',
    eventKey: null,
    onValueChange: (next) => emitted.push(next),
    commit: () => { commits += 1; },
    cancel: () => {},
    commitAndMove: () => {},
  } as unknown as EditorParams<string | null, ColorEditorParams>);

  const gui = editor.getGui();
  return {
    editor,
    gui,
    swatch: gui.querySelector<HTMLInputElement>('input[type="color"]')!,
    field: gui.querySelector<HTMLInputElement>('.pg-editor--color-hex'),
    emitted,
    get commits() { return commits; },
  };
}

/** Fires the `input` event a real control would after the user changed it. */
function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ColorEditor — registration', () => {
  it('is what a type: "color" column opens by default', () => {
    // The whole requested flow — focus the cell, press Enter, click the swatch —
    // rests on this mapping existing.
    expect(DEFAULT_EDITOR_BY_TYPE.color).toBe('color');
  });
});

describe('ColorEditor — opening on the stored colour', () => {
  it.each([
    ['#f00', '#ff0000'],
    ['#ff0000', '#ff0000'],
    ['rgb(255, 0, 0)', '#ff0000'],
    ['rgb(255 0 0 / 50%)', '#ff0000'],
    ['hsl(0, 100%, 50%)', '#ff0000'],
    ['red', '#ff0000'],
  ])('seeds the native swatch from %s', (value, expected) => {
    // <input type="color"> accepts #rrggbb and nothing else; without parsing,
    // every one of these but the second would open on black.
    expect(session(value).swatch.value).toBe(expected);
  });

  it('opens on the platform default for an empty cell', () => {
    expect(session(null).swatch.value).toBe('#000000');
  });

  it('builds only the swatch unless a text field is asked for', () => {
    expect(session('red').field).toBeNull();
    expect(session('red', { showHex: true }).field).not.toBeNull();
  });
});

describe('ColorEditor — committed notation', () => {
  it('preserves the notation the cell arrived in, by default', () => {
    // Editing one row of an hsl() column must not leave a hex code sitting in
    // the middle of it.
    const hsl = session('hsl(0, 100%, 50%)');
    type(hsl.swatch, '#0000ff');
    expect(hsl.editor.getValue()).toBe('hsl(240, 100%, 50%)');

    const rgb = session('rgb(255, 0, 0)');
    type(rgb.swatch, '#0000ff');
    expect(rgb.editor.getValue()).toBe('rgb(0, 0, 255)');

    const named = session('red');
    type(named.swatch, '#0000ff');
    expect(named.editor.getValue()).toBe('blue');
  });

  it('normalises to a named notation on request', () => {
    const s = session('hsl(0, 100%, 50%)', { outputFormat: 'hex' });
    type(s.swatch, '#0000ff');
    expect(s.editor.getValue()).toBe('#0000ff');
  });

  it('falls back to hex for a colour with no keyword', () => {
    const s = session('red', { outputFormat: 'name' });
    type(s.swatch, '#123456');
    expect(s.editor.getValue()).toBe('#123456');
  });

  it('falls back to hex when the cell held nothing to preserve', () => {
    const s = session(null);
    type(s.swatch, '#0000ff');
    expect(s.editor.getValue()).toBe('#0000ff');
  });
});

describe('ColorEditor — alpha', () => {
  it('carries the previous alpha through the native picker', () => {
    // The control has no alpha channel, so without this, choosing a hue would
    // silently make a translucent cell opaque.
    const s = session('rgba(255, 0, 0, 0.5)');
    type(s.swatch, '#0000ff');
    expect(s.editor.getValue()).toBe('rgba(0, 0, 255, 0.5)');
  });

  it('lets the text field set alpha outright, since the user wrote it all', () => {
    const s = session('rgba(255, 0, 0, 0.5)', { showHex: true });
    type(s.field!, 'rgb(0, 0, 255)');
    expect(s.editor.getValue()).toBe('rgb(0, 0, 255)');
  });

  it('leaves an opaque colour opaque', () => {
    const s = session('rgb(255, 0, 0)');
    type(s.swatch, '#0000ff');
    expect(s.editor.getValue()).toBe('rgb(0, 0, 255)');
  });
});

describe('ColorEditor — the text field', () => {
  it('accepts every notation, not hex alone', () => {
    const s = session('#ff0000', { showHex: true, outputFormat: 'hex' });
    for (const written of ['rgb(0, 0, 255)', 'hsl(240, 100%, 50%)', 'blue', '#00f']) {
      type(s.field!, written);
      expect(s.editor.getValue()).toBe('#0000ff');
    }
  });

  it('is long enough for the longest value a user might paste', () => {
    // maxLength 7 — enough for hex — would truncate 'rgba(255, 255, 255, 0.5)'
    // to 'rgba(25' and silently change the colour.
    expect(session('red', { showHex: true }).field!.maxLength).toBeGreaterThanOrEqual(24);
  });

  it('keeps the swatch in step, without writing back into the field', () => {
    const s = session('#ff0000', { showHex: true });
    type(s.field!, 'blue');
    expect(s.swatch.value).toBe('#0000ff');
    // Assigning to the field the user is typing in would jump their caret.
    expect(s.field!.value).toBe('blue');
  });

  it('keeps the field in step when the swatch moves', () => {
    const s = session('rgb(255, 0, 0)', { showHex: true });
    type(s.swatch, '#0000ff');
    expect(s.field!.value).toBe('rgb(0, 0, 255)');
  });

  it('holds the last complete colour while a value is half-typed', () => {
    const s = session('#ff0000', { showHex: true, outputFormat: 'hex' });
    type(s.field!, '#00');
    // '#00' is not a colour; committing it would blank a cell by accident.
    expect(s.editor.getValue()).toBe('#ff0000');
  });

  it('commits null when the field is cleared outright', () => {
    const s = session('#ff0000', { showHex: true });
    type(s.field!, '');
    expect(s.editor.getValue()).toBeNull();
  });

  it('commits null for an untouched empty cell, not the swatch placeholder', () => {
    expect(session(null).editor.getValue()).toBeNull();
    expect(session(null, { showHex: true }).editor.getValue()).toBeNull();
  });
});

describe('ColorEditor — presets', () => {
  it('accepts presets written in any notation', () => {
    const s = session('#ffffff', { presets: ['red', 'rgb(0, 128, 0)', '#00f'] });
    const buttons = s.gui.querySelectorAll('[data-color]');
    expect(buttons.length).toBe(3);
    expect(buttons[1].getAttribute('data-color')).toBe('#008000');
  });

  it('drops a preset that is not a colour rather than rendering a blank chip', () => {
    const s = session('#ffffff', { presets: ['red', 'not a colour'] });
    expect(s.gui.querySelectorAll('[data-color]').length).toBe(1);
  });

  it('applies a preset to both controls on click', () => {
    const s = session('#ffffff', { showHex: true, presets: ['#0000ff'] });
    s.gui.querySelector<HTMLElement>('[data-color]')!.click();
    expect(s.swatch.value).toBe('#0000ff');
    expect(s.field!.value).toBe('#0000ff');
  });

  it('suppresses the mousedown default, so the click does not close the session', () => {
    const s = session('#ffffff', { presets: ['#0000ff'] });
    const row = s.gui.querySelector('.pg-editor__color-presets')!;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    row.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('renders no preset row when the column supplied none', () => {
    expect(session('red').gui.querySelector('.pg-editor__color-presets')).toBeNull();
  });
});

describe('ColorEditor — grid contract', () => {
  it('reports every change as the user works', () => {
    const s = session('rgb(255, 0, 0)');
    type(s.swatch, '#0000ff');
    expect(s.emitted).toEqual(['rgb(0, 0, 255)']);
  });

  it('names both controls distinctly for assistive technology', () => {
    const s = session('red', { showHex: true });
    expect(s.swatch.getAttribute('aria-label')).toBe('Brand colour');
    expect(s.field!.getAttribute('aria-label')).toBe('Brand colour colour value');
  });

  it('focuses the text field when there is one, the swatch otherwise', () => {
    document.body.appendChild(session('red', { showHex: true }).gui);
    const withField = session('red', { showHex: true });
    document.body.appendChild(withField.gui);
    withField.editor.focus();
    expect(document.activeElement).toBe(withField.field);

    const swatchOnly = session('red');
    document.body.appendChild(swatchOnly.gui);
    swatchOnly.editor.focus();
    expect(document.activeElement).toBe(swatchOnly.swatch);
  });

  it('detaches every listener on destroy', () => {
    const s = session('#ff0000', { showHex: true });
    s.editor.destroy();
    type(s.field!, 'blue');
    // The handler is gone, so nothing was reported.
    expect(s.emitted).toEqual([]);
  });
});
