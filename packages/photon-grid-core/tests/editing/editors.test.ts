// @vitest-environment jsdom

/**
 * The built-in editors' behavioural contract.
 *
 * Three things are asserted for every editor in the default set, because they
 * are the three the grid depends on and the three a new editor is most likely to
 * get wrong:
 *
 * 1. `init` followed by `getGui` yields a real element — the grid mounts the
 *    result without checking it.
 * 2. `getValue()` round-trips the value it was opened with. An editor that
 *    quietly reshapes an untouched value corrupts data on any commit the user
 *    did not intend, which is the worst class of grid bug: invisible, and caused
 *    by merely looking at a cell.
 * 3. `destroy()` really detaches. Editors are created and discarded thousands of
 *    times per session; one surviving listener retains the editor, its params,
 *    its row node and its cell element.
 *
 * Beyond that, the cases here are the specific hazards each editor exists to
 * handle — `NaN` escaping the numeric field, a `<select>` rewriting a value it
 * cannot represent, a date shifting a day across the UTC boundary, and the
 * combobox's keyboard and validation rules.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AutocompleteEditor,
  CheckboxEditor,
  ColorEditor,
  DateEditor,
  DatetimeEditor,
  NumberEditor,
  PasswordEditor,
  RangeEditor,
  SelectEditor,
  SwitchEditor,
  TextEditor,
  TextareaEditor,
  TimeEditor,
  createDefaultEditors,
} from '../../src/editing/editors/index';
import type {
  BuiltInEditorName,
  CellEditorParams,
  ICellEditor,
} from '../../src/editing/types/cell-editor.types';
import type { ColumnDef, ColumnDropdownOption } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A minimal row node — editors read only its identity, never its graph. */
function makeNode(data: Record<string, unknown> = {}): RowNode {
  return {
    nodeId: 'node-1',
    rowIndex: 0,
    data,
    type: 'data',
    selected: false,
    expanded: false,
    editable: true,
    level: 0,
    parent: null,
    children: [],
    height: 32,
    top: 0,
  } as RowNode;
}

/** A minimal editable column, extended per test. */
function makeColDef(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return {
    colId: 'field',
    field: 'field',
    header: 'Field',
    type: 'string',
    editable: true,
    ...overrides,
  } as ColumnDef;
}

/**
 * Builds a valid {@link CellEditorParams}.
 *
 * Every member the contract declares is present, so a test exercises the same
 * shape the grid passes — an editor reaching for a member this helper forgot
 * would fail here for the wrong reason.
 */
function makeParams<TValue = unknown, TParams = Record<string, unknown>>(
  overrides: Partial<CellEditorParams<TValue, Record<string, unknown>, TParams>> = {},
): CellEditorParams<TValue, Record<string, unknown>, TParams> {
  const value = (overrides.value ?? null) as TValue;

  return {
    value,
    initialValue: value,
    data: {},
    node: makeNode(),
    colDef: makeColDef(),
    rowIndex: 0,
    cellElement: document.createElement('div'),
    params: {} as TParams,
    api: null,
    trigger: 'click',
    eventKey: null,
    onValueChange: () => undefined,
    commit: () => undefined,
    cancel: () => undefined,
    commitAndMove: () => undefined,
    ...overrides,
  };
}

/** Creates, initialises and mounts an editor, as the grid would. */
function mount<TEditor extends ICellEditor<never, never, never>>(
  editor: TEditor,
  params: CellEditorParams<never, never, never>,
): TEditor {
  editor.init(params);
  document.body.appendChild(editor.getGui());
  return editor;
}

/** Dispatches a bubbling, cancellable event. */
function fire(element: Element, type: string): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

/** Dispatches a bubbling, cancellable key press. */
function press(element: Element, key: string, modifiers: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  element.dispatchEvent(event);
  return event;
}

/**
 * Pokes every element in an editor with every interaction any built-in listens
 * for, so one helper can prove "this editor reports changes" and — after
 * `destroy` — "this editor reports nothing".
 */
function interactWithEverything(root: HTMLElement): void {
  const elements: Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const element of elements) {
    fire(element, 'input');
    fire(element, 'change');
    fire(element, 'mousedown');
    fire(element, 'click');
    press(element, ' ');
  }
}

const OPTIONS: readonly ColumnDropdownOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

/**
 * The same set `AbstractCellEditor.focus` walks, so "the control the user lands
 * on" means the same thing in the tests as it does in the editors.
 */
const FOCUSABLE =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
  'button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/** The element focus actually lands on when an editor opens. */
function focusTarget(root: HTMLElement): HTMLElement | null {
  return root.matches(FOCUSABLE) ? root : root.querySelector<HTMLElement>(FOCUSABLE);
}

/**
 * One representative round trip per built-in: the value a column of that type
 * holds, and what the editor must hand back when the user changes nothing.
 */
interface RoundTrip {
  readonly name: BuiltInEditorName;
  readonly value: unknown;
  readonly expected: unknown;
  readonly colDef?: Partial<ColumnDef>;
  readonly params?: Record<string, unknown>;
}

const ROUND_TRIPS: readonly RoundTrip[] = [
  { name: 'text', value: 'Widget', expected: 'Widget' },
  { name: 'textarea', value: 'line one\nline two', expected: 'line one\nline two' },
  { name: 'number', value: 42, expected: 42 },
  { name: 'email', value: 'sam@example.com', expected: 'sam@example.com' },
  { name: 'password', value: ' s3cret ', expected: ' s3cret ' },
  { name: 'url', value: 'https://photon.dev', expected: 'https://photon.dev' },
  { name: 'checkbox', value: true, expected: true },
  { name: 'switch', value: true, expected: true },
  { name: 'select', value: 'beta', expected: 'beta', colDef: { dropdownOptions: [...OPTIONS] } },
  {
    name: 'autocomplete',
    value: 'beta',
    expected: 'beta',
    colDef: { dropdownOptions: [...OPTIONS] },
  },
  { name: 'date', value: '2024-03-15T00:00:00.000Z', expected: '2024-03-15T00:00:00.000Z' },
  {
    name: 'datetime',
    value: '2024-03-15T13:45:00.000Z',
    expected: '2024-03-15T13:45:00.000Z',
  },
  { name: 'time', value: '09:30', expected: '09:30' },
  { name: 'color', value: '#2563eb', expected: '#2563eb' },
  { name: 'range', value: 42, expected: 42 },
];

// ─── The default set ──────────────────────────────────────────────────────────

describe('createDefaultEditors', () => {
  it('registers exactly the fifteen built-in names', () => {
    const names: readonly BuiltInEditorName[] = [
      'text', 'textarea', 'number', 'email', 'password', 'url', 'checkbox',
      'switch', 'select', 'autocomplete', 'date', 'datetime', 'time', 'color', 'range',
    ];

    expect(Object.keys(createDefaultEditors()).sort()).toEqual([...names].sort());
  });

  it('returns constructors, not shared instances', () => {
    const editors = createDefaultEditors();
    const first = new editors.text();
    const second = new editors.text();

    expect(first).not.toBe(second);
  });
});

describe('every built-in editor', () => {
  for (const spec of ROUND_TRIPS) {
    describe(spec.name, () => {
      const build = (): { editor: ICellEditor<never, never, never>; changes: unknown[] } => {
        const changes: unknown[] = [];
        const Editor = createDefaultEditors()[spec.name];
        const params = makeParams({
          value: spec.value,
          colDef: makeColDef(spec.colDef),
          params: spec.params ?? {},
          onValueChange: (value: unknown) => changes.push(value),
        }) as unknown as CellEditorParams<never, never, never>;

        return { editor: mount(new Editor() as ICellEditor<never, never, never>, params), changes };
      };

      it('builds a GUI element', () => {
        const { editor } = build();

        expect(editor.getGui()).toBeInstanceOf(HTMLElement);
        expect(editor.getGui().isConnected).toBe(true);
        editor.destroy?.();
      });

      it('round-trips its opening value', () => {
        const { editor } = build();

        expect(editor.getValue()).toEqual(spec.expected);
        editor.destroy?.();
      });

      it('stops reporting once destroyed', () => {
        const { editor, changes } = build();

        interactWithEverything(editor.getGui());
        expect(changes.length).toBeGreaterThan(0);

        changes.length = 0;
        editor.destroy?.();
        interactWithEverything(editor.getGui());

        expect(changes).toEqual([]);
      });

      it('gives the control the user focuses an accessible name', () => {
        const { editor } = build();

        // `EditorHost` labels the *root*; anything composite must label its own
        // inner control, or a screen reader announces the group and then an
        // unnamed input.
        const control = focusTarget(editor.getGui());
        expect(control).not.toBeNull();
        expect(control?.getAttribute('aria-label')).toBe('Field');

        editor.destroy?.();
      });

      it('survives afterGuiAttached in an environment without showPicker', () => {
        const { editor } = build();

        // jsdom implements no `showPicker`, which is exactly the older-browser
        // case the guard exists for: entering the cell must not throw.
        expect(() => editor.afterGuiAttached?.()).not.toThrow();

        editor.destroy?.();
      });
    });
  }
});

// ─── Text ─────────────────────────────────────────────────────────────────────

describe('TextEditor', () => {
  it('trims by default and honours trim: false', () => {
    const trimming = mount(
      new TextEditor(),
      makeParams({ value: '  padded  ' }) as never,
    );
    expect(trimming.getValue()).toBe('padded');

    const raw = mount(
      new TextEditor(),
      makeParams({ value: '  padded  ', params: { trim: false } }) as never,
    );
    expect(raw.getValue()).toBe('  padded  ');
  });

  it('seeds itself with the typed character rather than the cell value', () => {
    const editor = mount(
      new TextEditor(),
      makeParams({ value: 'existing', trigger: 'type', eventKey: 'Q' }) as never,
    );

    expect((editor.getGui() as HTMLInputElement).value).toBe('Q');
    expect(editor.getValue()).toBe('Q');
  });

  it('applies maxLength and placeholder to the field', () => {
    const editor = mount(
      new TextEditor(),
      makeParams({ value: '', params: { maxLength: 8, placeholder: 'SKU' } }) as never,
    );
    const input = editor.getGui() as HTMLInputElement;

    expect(input.maxLength).toBe(8);
    expect(input.placeholder).toBe('SKU');
  });
});

// ─── Textarea ─────────────────────────────────────────────────────────────────

describe('TextareaEditor', () => {
  it('is a popup', () => {
    const editor = new TextareaEditor();
    editor.init(makeParams({ value: '' }) as never);

    expect(editor.isPopup()).toBe(true);
  });

  it('builds a textarea with the requested rows', () => {
    const editor = mount(
      new TextareaEditor(),
      makeParams({ value: '', params: { rows: 6 } }) as never,
    );

    expect(editor.getGui()).toBeInstanceOf(HTMLTextAreaElement);
    expect((editor.getGui() as HTMLTextAreaElement).rows).toBe(6);
  });

  it('lets plain Enter insert a newline instead of committing', () => {
    const commit = vi.fn();
    const editor = mount(
      new TextareaEditor(),
      makeParams({ value: '', commit }) as never,
    );

    const event = press(editor.getGui(), 'Enter');

    expect(commit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('commits on Ctrl+Enter and on Cmd+Enter', () => {
    const commit = vi.fn();
    const editor = mount(
      new TextareaEditor(),
      makeParams({ value: '', commit }) as never,
    );

    press(editor.getGui(), 'Enter', { ctrlKey: true });
    press(editor.getGui(), 'Enter', { metaKey: true });

    expect(commit).toHaveBeenCalledTimes(2);
  });
});

// ─── Number ───────────────────────────────────────────────────────────────────

describe('NumberEditor', () => {
  const build = (value: unknown, params: Record<string, unknown> = {}): NumberEditor =>
    mount(new NumberEditor(), makeParams({ value, params }) as never);

  it('never returns NaN', () => {
    for (const raw of ['', '   ', 'abc', '1e', '-', '--5', 'Infinity']) {
      const editor = build(0);
      (editor.getGui() as HTMLInputElement).value = raw;

      const result = editor.getValue();
      expect(result === null || Number.isFinite(result)).toBe(true);
      expect(Number.isNaN(result as number)).toBe(false);
    }
  });

  it('returns null for an empty field rather than zero', () => {
    const editor = build(7);
    (editor.getGui() as HTMLInputElement).value = '';

    expect(editor.getValue()).toBeNull();
  });

  it('clamps to the declared range', () => {
    const editor = build(0, { min: 0, max: 10 });
    const input = editor.getGui() as HTMLInputElement;

    input.value = '99';
    expect(editor.getValue()).toBe(10);

    input.value = '-99';
    expect(editor.getValue()).toBe(0);
  });

  it('treats allowNegative: false as a floor of zero', () => {
    const editor = build(0, { allowNegative: false });
    (editor.getGui() as HTMLInputElement).value = '-5';

    expect(editor.getValue()).toBe(0);
  });

  it('rounds to the declared precision', () => {
    const editor = build(0, { precision: 2 });
    (editor.getGui() as HTMLInputElement).value = '1.239';

    expect(editor.getValue()).toBe(1.24);
  });

  it('falls back to the column bounds when the editor declares none', () => {
    const editor = mount(
      new NumberEditor(),
      makeParams({ value: 0, colDef: makeColDef({ min: 1, max: 5 }) }) as never,
    );
    (editor.getGui() as HTMLInputElement).value = '9';

    expect(editor.getValue()).toBe(5);
  });

  it('reports every keystroke', () => {
    const changes: unknown[] = [];
    const editor = mount(
      new NumberEditor(),
      makeParams({ value: 1, onValueChange: (v: unknown) => changes.push(v) }) as never,
    );

    const input = editor.getGui() as HTMLInputElement;
    input.value = '25';
    fire(input, 'input');

    expect(changes).toEqual([25]);
  });
});

// ─── Select ───────────────────────────────────────────────────────────────────

describe('SelectEditor', () => {
  const build = (value: unknown, colDef: Partial<ColumnDef>, params = {}): SelectEditor =>
    mount(new SelectEditor(), makeParams({ value, colDef: makeColDef(colDef), params }) as never);

  it('sources its options from colDef.dropdownOptions', () => {
    const editor = build('beta', { dropdownOptions: [...OPTIONS] });
    const select = editor.getGui() as HTMLSelectElement;

    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(select.value).toBe('beta');
  });

  it('falls back to colDef.enumOptions', () => {
    const editor = build('b', { enumOptions: ['a', 'b'] });
    const select = editor.getGui() as HTMLSelectElement;

    expect(Array.from(select.options).map((option) => option.textContent)).toEqual(['a', 'b']);
    expect(editor.getValue()).toBe('b');
  });

  it('prefers explicit params over the column declaration', () => {
    const editor = build('x', { dropdownOptions: [...OPTIONS] }, {
      options: [{ value: 'x', label: 'Only' }],
    });

    expect((editor.getGui() as HTMLSelectElement).options).toHaveLength(1);
    expect(editor.getValue()).toBe('x');
  });

  it('adds a blank choice for a value no option represents, so opening cannot rewrite it', () => {
    const editor = build('unknown', { dropdownOptions: [...OPTIONS] });
    const select = editor.getGui() as HTMLSelectElement;

    expect(select.options[0].value).toBe('');
    expect(select.value).toBe('');
    expect(editor.getValue()).toBeNull();
  });

  it('gives the blank choice real text, so it is not announced as silence', () => {
    const unmatched = build('unknown', { dropdownOptions: [...OPTIONS] });
    expect((unmatched.getGui() as HTMLSelectElement).options[0].textContent).toBe('Select…');

    const empty = build('alpha', { dropdownOptions: [...OPTIONS] }, { allowEmpty: true });
    expect((empty.getGui() as HTMLSelectElement).options[0].textContent).toBe('Select…');

    const custom = build('unknown', { dropdownOptions: [...OPTIONS] }, {
      placeholder: '— none —',
    });
    expect((custom.getGui() as HTMLSelectElement).options[0].textContent).toBe('— none —');
  });

  it('reports the picked value on change', () => {
    const changes: unknown[] = [];
    const editor = mount(
      new SelectEditor(),
      makeParams({
        value: 'alpha',
        colDef: makeColDef({ dropdownOptions: [...OPTIONS] }),
        onValueChange: (v: unknown) => changes.push(v),
      }) as never,
    );

    const select = editor.getGui() as HTMLSelectElement;
    select.value = 'gamma';
    fire(select, 'change');

    expect(changes).toEqual(['gamma']);
    expect(editor.getValue()).toBe('gamma');
  });

  it('commits the whole option object for an object-valued column', () => {
    const editor = mount(
      new SelectEditor(),
      makeParams({
        value: { value: 'beta', label: 'Beta' },
        colDef: makeColDef({ type: 'object', dropdownOptions: [...OPTIONS] }),
      }) as never,
    );

    expect(editor.getValue()).toEqual({ value: 'beta', label: 'Beta' });
  });
});

// ─── Booleans ─────────────────────────────────────────────────────────────────

describe('CheckboxEditor', () => {
  it('is a real focusable checkbox with an accessible name', () => {
    const editor = mount(new CheckboxEditor(), makeParams({ value: true }) as never);
    const gui = editor.getGui() as HTMLInputElement;

    expect(gui).toBeInstanceOf(HTMLInputElement);
    expect(gui.type).toBe('checkbox');
    expect(gui.disabled).toBe(false);
    expect(gui.getAttribute('aria-label')).toBe('Field');
  });

  it('prefers an explicit label over the column header', () => {
    const editor = mount(
      new CheckboxEditor(),
      makeParams({ value: true, params: { label: 'Receives alerts' } }) as never,
    );

    expect(editor.getGui().getAttribute('aria-label')).toBe('Receives alerts');
  });

  it('reads the truthy shapes a boolean column actually stores', () => {
    for (const [value, expected] of [
      [true, true], ['true', true], [1, true], ['Y', true],
      [false, false], ['false', false], [0, false], ['', false], [null, false],
    ] as ReadonlyArray<readonly [unknown, boolean]>) {
      const editor = mount(new CheckboxEditor(), makeParams({ value }) as never);
      expect(editor.getValue()).toBe(expected);
    }
  });

  it('toggles on Space and reports the new state', () => {
    const changes: unknown[] = [];
    const editor = mount(
      new CheckboxEditor(),
      makeParams({ value: false, onValueChange: (v: unknown) => changes.push(v) }) as never,
    );

    const event = press(editor.getGui(), ' ');

    expect(editor.getValue()).toBe(true);
    expect(changes).toEqual([true]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('commits immediately when the column asked it to', () => {
    const commit = vi.fn();
    const editor = mount(
      new CheckboxEditor(),
      makeParams({ value: false, commit, params: { commitOnToggle: true } }) as never,
    );

    press(editor.getGui(), ' ');

    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe('SwitchEditor', () => {
  it('exposes switch semantics', () => {
    const editor = mount(new SwitchEditor(), makeParams({ value: true }) as never);
    const gui = editor.getGui();

    expect(gui.getAttribute('role')).toBe('switch');
    expect(gui.getAttribute('aria-checked')).toBe('true');
    expect(gui.getAttribute('aria-label')).toBe('Field');
  });

  it('toggles on click and on Space, keeping aria-checked in step', () => {
    const editor = mount(new SwitchEditor(), makeParams({ value: false }) as never);
    const gui = editor.getGui();

    fire(gui, 'click');
    expect(editor.getValue()).toBe(true);
    expect(gui.getAttribute('aria-checked')).toBe('true');

    press(gui, ' ');
    expect(editor.getValue()).toBe(false);
    expect(gui.getAttribute('aria-checked')).toBe('false');
  });

  it('toggles on Enter too, as the ARIA switch pattern requires', () => {
    const editor = mount(new SwitchEditor(), makeParams({ value: false }) as never);
    const gui = editor.getGui();

    const event = press(gui, 'Enter');

    expect(editor.getValue()).toBe(true);
    expect(gui.getAttribute('aria-checked')).toBe('true');
    // Consumed, so the button's own Enter activation cannot toggle it a second
    // time and the grid cannot close the session out from under it.
    expect(event.defaultPrevented).toBe(true);
  });

  it('is a real button that cannot submit a surrounding form', () => {
    const editor = mount(new SwitchEditor(), makeParams({ value: false }) as never);

    expect((editor.getGui() as HTMLButtonElement).type).toBe('button');
  });
});

// ─── Temporal ─────────────────────────────────────────────────────────────────

describe('DateEditor', () => {
  it('round-trips an ISO string without shifting the day', () => {
    const editor = mount(
      new DateEditor(),
      makeParams({ value: '2024-03-15T00:00:00.000Z' }) as never,
    );

    expect((editor.getGui() as HTMLInputElement).value).toBe('2024-03-15');
    expect(editor.getValue()).toBe('2024-03-15T00:00:00.000Z');
  });

  it('accepts a Date and a timestamp, and commits an ISO string either way', () => {
    const iso = '2024-03-15T00:00:00.000Z';

    for (const value of [new Date(iso), Date.parse(iso), '2024-03-15']) {
      const editor = mount(new DateEditor(), makeParams({ value }) as never);
      expect(editor.getValue()).toBe(iso);
    }
  });

  it('commits null for an empty field', () => {
    const editor = mount(new DateEditor(), makeParams({ value: null }) as never);

    expect(editor.getValue()).toBeNull();
  });

  it('constrains the picker with min and max', () => {
    const editor = mount(
      new DateEditor(),
      makeParams({ value: null, params: { min: '2024-01-01', max: new Date('2024-12-31T00:00:00Z') } }) as never,
    );
    const input = editor.getGui() as HTMLInputElement;

    expect(input.min).toBe('2024-01-01');
    expect(input.max).toBe('2024-12-31');
  });
});

describe('DatetimeEditor', () => {
  it('round-trips an ISO string through the minute-precision control', () => {
    const editor = mount(
      new DatetimeEditor(),
      makeParams({ value: '2024-03-15T13:45:00.000Z' }) as never,
    );

    expect((editor.getGui() as HTMLInputElement).value).toBe('2024-03-15T13:45');
    expect(editor.getValue()).toBe('2024-03-15T13:45:00.000Z');
  });
});

// ─── Composite controls ───────────────────────────────────────────────────────

describe('ColorEditor', () => {
  /** The colour editor with the optional hex field switched on. */
  const withHex = (value: unknown, params: Record<string, unknown> = {}): ColorEditor =>
    mount(
      new ColorEditor(),
      makeParams({ value, params: { showHex: true, ...params } }) as never,
    );

  it('renders a single swatch and nothing else by default', () => {
    const editor = mount(new ColorEditor(), makeParams({ value: '#2563eb' }) as never);
    const inputs = Array.from(editor.getGui().querySelectorAll('input'));

    expect(inputs).toHaveLength(1);
    expect(inputs[0].type).toBe('color');
    expect(inputs[0].value).toBe('#2563eb');
    expect(editor.getGui().querySelector('[type="text"]')).toBeNull();
  });

  it('reports the picked colour from the swatch alone', () => {
    const changes: unknown[] = [];
    const editor = mount(
      new ColorEditor(),
      makeParams({ value: '#2563eb', onValueChange: (v: unknown) => changes.push(v) }) as never,
    );
    const swatch = editor.getGui().querySelector('input') as HTMLInputElement;

    swatch.value = '#dc2626';
    fire(swatch, 'input');

    expect(changes).toEqual(['#dc2626']);
    expect(editor.getValue()).toBe('#dc2626');
  });

  it('leaves an untouched empty cell empty rather than committing the default black', () => {
    const editor = mount(new ColorEditor(), makeParams({ value: null }) as never);

    expect(editor.getValue()).toBeNull();
  });

  it('adds the colour field only when showHex is on', () => {
    const editor = withHex('#2563eb');
    const inputs = Array.from(editor.getGui().querySelectorAll('input'));

    expect(inputs).toHaveLength(2);
    expect(inputs[1].type).toBe('text');
    // Named for what it accepts — any CSS colour notation, not hex alone.
    expect(inputs[1].getAttribute('aria-label')).toBe('Field colour value');
  });

  it('keeps the swatch and the hex field in step', () => {
    const editor = withHex('#2563eb');
    const [swatch, hex] = Array.from(editor.getGui().querySelectorAll('input'));

    expect(swatch.value).toBe('#2563eb');
    expect(hex.value).toBe('#2563eb');

    hex.value = '#0f0';
    fire(hex, 'input');

    expect(swatch.value).toBe('#00ff00');
    expect(editor.getValue()).toBe('#00ff00');
  });

  it('keeps the last complete colour while a partial one is being typed', () => {
    const editor = withHex('#2563eb');
    const hex = editor.getGui().querySelectorAll('input')[1];

    hex.value = '#25';
    fire(hex, 'input');

    expect(editor.getValue()).toBe('#2563eb');
  });

  it('commits null once the field is cleared', () => {
    const editor = withHex('#2563eb');
    const hex = editor.getGui().querySelectorAll('input')[1];

    hex.value = '';
    fire(hex, 'input');

    expect(editor.getValue()).toBeNull();
  });

  it('renders normalised presets', () => {
    const editor = mount(
      new ColorEditor(),
      makeParams({ value: null, params: { presets: ['#abc', 'dc2626'] } }) as never,
    );

    const presets = Array.from(editor.getGui().querySelectorAll('[data-color]'));
    expect(presets.map((button) => button.getAttribute('data-color'))).toEqual([
      '#aabbcc',
      '#dc2626',
    ]);
    expect(presets.every((button) => (button as HTMLButtonElement).type === 'button')).toBe(true);

    fire(presets[1], 'click');
    expect(editor.getValue()).toBe('#dc2626');
  });

  it('drives the swatch from a preset even with no hex field present', () => {
    const editor = mount(
      new ColorEditor(),
      makeParams({ value: null, params: { presets: ['#16a34a'] } }) as never,
    );
    const swatch = editor.getGui().querySelector('input') as HTMLInputElement;

    fire(editor.getGui().querySelector('[data-color]') as Element, 'click');

    expect(swatch.value).toBe('#16a34a');
    expect(editor.getValue()).toBe('#16a34a');
  });
});

describe('RangeEditor', () => {
  it('pairs the slider with a linked readout', () => {
    const editor = mount(
      new RangeEditor(),
      makeParams({ value: 40, params: { suffix: '%' } }) as never,
    );
    const slider = editor.getGui().querySelector('input') as HTMLInputElement;
    const readout = editor.getGui().querySelector('output') as HTMLOutputElement;

    expect(readout.getAttribute('for')).toBe(slider.id);
    expect(readout.textContent).toBe('40%');

    slider.value = '75';
    fire(slider, 'input');

    expect(readout.textContent).toBe('75%');
    expect(editor.getValue()).toBe(75);
  });

  it('omits the readout when showValue is false', () => {
    const editor = mount(
      new RangeEditor(),
      makeParams({ value: 40, params: { showValue: false } }) as never,
    );

    expect(editor.getGui().querySelector('output')).toBeNull();
  });

  it('opens at the minimum when the cell holds nothing numeric', () => {
    const editor = mount(
      new RangeEditor(),
      makeParams({ value: 'not a number', params: { min: 10, max: 20 } }) as never,
    );

    expect(editor.getValue()).toBe(10);
  });

  it('states its range and tracks its position in ARIA', () => {
    const editor = mount(
      new RangeEditor(),
      makeParams({ value: 40, params: { min: 10, max: 90, step: 5 } }) as never,
    );
    const slider = editor.getGui().querySelector('input') as HTMLInputElement;

    expect(slider.getAttribute('aria-valuemin')).toBe('10');
    expect(slider.getAttribute('aria-valuemax')).toBe('90');
    expect(slider.getAttribute('aria-valuenow')).toBe('40');

    slider.value = '75';
    fire(slider, 'input');

    expect(slider.getAttribute('aria-valuenow')).toBe('75');
    // No suffix configured, so nothing should override the platform's own
    // rendering of the number.
    expect(slider.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('speaks the suffix through aria-valuetext', () => {
    const editor = mount(
      new RangeEditor(),
      makeParams({ value: 40, params: { suffix: '%' } }) as never,
    );
    const slider = editor.getGui().querySelector('input') as HTMLInputElement;

    expect(slider.getAttribute('aria-valuetext')).toBe('40%');

    slider.value = '75';
    fire(slider, 'input');

    expect(slider.getAttribute('aria-valuetext')).toBe('75%');
    expect(slider.getAttribute('aria-valuenow')).toBe('75');
  });
});

// ─── Password ─────────────────────────────────────────────────────────────────

describe('PasswordEditor', () => {
  /** The editor with its optional reveal button, and that button. */
  function reveal(): { editor: PasswordEditor; input: HTMLInputElement; toggle: HTMLButtonElement } {
    const editor = mount(
      new PasswordEditor(),
      makeParams({ value: 's3cret', params: { revealToggle: true } }) as never,
    );
    const gui = editor.getGui();

    return {
      editor,
      input: gui.querySelector('input') as HTMLInputElement,
      toggle: gui.querySelector('button') as HTMLButtonElement,
    };
  }

  it('is the bare input when no reveal button was asked for', () => {
    const editor = mount(new PasswordEditor(), makeParams({ value: 's3cret' }) as never);
    const gui = editor.getGui() as HTMLInputElement;

    expect(gui).toBeInstanceOf(HTMLInputElement);
    expect(gui.type).toBe('password');
    expect(gui.getAttribute('aria-label')).toBe('Field');
  });

  it('names the field itself, not just the wrapper the host labels', () => {
    const { input } = reveal();

    expect(input.getAttribute('aria-label')).toBe('Field');
  });

  it('toggles aria-pressed and its label as the value is revealed and hidden', () => {
    const { input, toggle } = reveal();

    expect(toggle.type).toBe('button');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show value');

    fire(toggle, 'click');
    expect(input.getAttribute('type')).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide value');

    fire(toggle, 'click');
    expect(input.getAttribute('type')).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show value');
  });

  it('honours localised reveal labels', () => {
    const editor = mount(
      new PasswordEditor(),
      makeParams({
        value: 's3cret',
        params: { revealToggle: true, revealLabel: 'Afficher', hideLabel: 'Masquer' },
      }) as never,
    );
    const toggle = editor.getGui().querySelector('button') as HTMLButtonElement;

    expect(toggle.getAttribute('aria-label')).toBe('Afficher');
    fire(toggle, 'click');
    expect(toggle.getAttribute('aria-label')).toBe('Masquer');
  });
});

// ─── Native pickers ───────────────────────────────────────────────────────────

describe('native picker editors', () => {
  const pickers = [
    { name: 'date', Editor: DateEditor, modifier: 'pg-editor--date' },
    { name: 'datetime', Editor: DatetimeEditor, modifier: 'pg-editor--datetime' },
    { name: 'time', Editor: TimeEditor, modifier: 'pg-editor--time' },
  ] as const;

  for (const { name, Editor, modifier } of pickers) {
    it(`marks the ${name} input with the shared picker modifier`, () => {
      const editor = mount(new Editor(), makeParams({ value: null }) as never);
      const gui = editor.getGui();

      expect(gui.classList.contains('pg-editor')).toBe(true);
      expect(gui.classList.contains(modifier)).toBe(true);
      expect(gui.classList.contains('pg-editor--picker')).toBe(true);
    });

    it(`focuses the ${name} field on attach without needing showPicker`, () => {
      const editor = mount(new Editor(), makeParams({ value: null }) as never);

      expect(() => editor.afterGuiAttached()).not.toThrow();
      expect(document.activeElement).toBe(editor.getGui());
    });

    it(`calls showPicker for ${name} when the platform has one`, () => {
      const showPicker = vi.fn();
      const editor = mount(new Editor(), makeParams({ value: null }) as never);
      Object.defineProperty(editor.getGui(), 'showPicker', {
        configurable: true,
        value: showPicker,
      });

      editor.afterGuiAttached();

      expect(showPicker).toHaveBeenCalledTimes(1);
    });

    it(`swallows a SecurityError from ${name}'s showPicker`, () => {
      const editor = mount(new Editor(), makeParams({ value: null }) as never);
      Object.defineProperty(editor.getGui(), 'showPicker', {
        configurable: true,
        value: () => {
          throw new Error('SecurityError');
        },
      });

      // Non-fatal by design: the field is focused and keyboard-operable, so a
      // refused picker must not break the session.
      expect(() => editor.afterGuiAttached()).not.toThrow();
    });
  }

  it('opens the select list on attach, and survives a platform without showPicker', () => {
    const editor = mount(
      new SelectEditor(),
      makeParams({
        value: 'beta',
        colDef: makeColDef({ dropdownOptions: [...OPTIONS] }),
      }) as never,
    );

    expect(() => editor.afterGuiAttached()).not.toThrow();
    expect(document.activeElement).toBe(editor.getGui());

    const showPicker = vi.fn();
    Object.defineProperty(editor.getGui(), 'showPicker', {
      configurable: true,
      value: showPicker,
    });
    editor.afterGuiAttached();

    expect(showPicker).toHaveBeenCalledTimes(1);
  });
});

// ─── Commit on change ─────────────────────────────────────────────────────────

/**
 * The fix for "it takes two Enters".
 *
 * Every one of these controls takes its value from an OS-level popup — a
 * calendar, a clock, a `<select>`'s dropped-open list — and that popup consumes
 * the `Enter` that chooses a value rather than dispatching it to the page. The
 * grid's `Enter`-to-commit binding therefore only ever saw the *second* press.
 * Committing from `change` is what makes one gesture both pick and close, so
 * these cases assert exactly that: one `change`, one `commit`.
 */
describe('picking a value closes the session', () => {
  const pickers = [
    { name: 'select', Editor: SelectEditor, colDef: { dropdownOptions: [...OPTIONS] } },
    { name: 'date', Editor: DateEditor, colDef: {} },
    { name: 'datetime', Editor: DatetimeEditor, colDef: {} },
    { name: 'time', Editor: TimeEditor, colDef: {} },
  ] as const;

  /** Mounts one picker with a spied `commit`, as the grid would. */
  function picker(
    Editor: new () => ICellEditor<never, never, never>,
    colDef: Partial<ColumnDef>,
    params: Record<string, unknown> = {},
  ): { gui: HTMLElement; commit: ReturnType<typeof vi.fn> } {
    const commit = vi.fn();
    const editor = mount(
      new Editor(),
      makeParams({ value: null, colDef: makeColDef(colDef), params, commit }) as never,
    );

    return { gui: editor.getGui(), commit };
  }

  for (const { name, Editor, colDef } of pickers) {
    it(`commits the ${name} editor as soon as its value changes`, () => {
      const { gui, commit } = picker(Editor, colDef);

      fire(gui, 'change');

      expect(commit).toHaveBeenCalledTimes(1);
    });

    it(`commits the ${name} editor only once, however many change events arrive`, () => {
      const { gui, commit } = picker(Editor, colDef);

      // A browser can fire a trailing `change` at the control while the commit
      // is still tearing the session down; the second must be swallowed rather
      // than reaching a session that is already closing.
      fire(gui, 'change');
      fire(gui, 'change');

      expect(commit).toHaveBeenCalledTimes(1);
    });

    it(`leaves the ${name} editor open when commitOnChange is false`, () => {
      const { gui, commit } = picker(Editor, colDef, { commitOnChange: false });

      fire(gui, 'change');

      expect(commit).not.toHaveBeenCalled();
    });

    it(`stops committing once the ${name} editor is destroyed`, () => {
      const commit = vi.fn();
      const editor = mount(
        new Editor(),
        makeParams({ value: null, colDef: makeColDef(colDef), commit }) as never,
      );

      editor.destroy?.();
      fire(editor.getGui(), 'change');

      expect(commit).not.toHaveBeenCalled();
    });
  }

  it('still reports the picked value to the grid as well as committing it', () => {
    const changes: unknown[] = [];
    const commit = vi.fn();
    const editor = mount(
      new SelectEditor(),
      makeParams({
        value: 'alpha',
        colDef: makeColDef({ dropdownOptions: [...OPTIONS] }),
        onValueChange: (v: unknown) => changes.push(v),
        commit,
      }) as never,
    );

    const select = editor.getGui() as HTMLSelectElement;
    select.value = 'gamma';
    fire(select, 'change');

    expect(changes).toEqual(['gamma']);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('does not commit a plain text field on change, which fires on blur', () => {
    const commit = vi.fn();
    const editor = mount(new TextEditor(), makeParams({ value: 'Widget', commit }) as never);

    fire(editor.getGui(), 'change');

    expect(commit).not.toHaveBeenCalled();
  });

  it('leaves the select free of any width or size the stylesheet cannot override', () => {
    const editor = mount(
      new SelectEditor(),
      makeParams({
        value: 'beta',
        colDef: makeColDef({ dropdownOptions: [...OPTIONS] }),
      }) as never,
    );
    const select = editor.getGui() as HTMLSelectElement;

    // The theme gives `.pg-editor--select` `width: 100%`; an inline width or a
    // `size` attribute would pin the control to its longest option instead and
    // leave it disagreeing with the column it sits in.
    expect(select.getAttribute('style')).toBeNull();
    expect(select.hasAttribute('size')).toBe(false);
  });
});

// ─── Autocomplete ─────────────────────────────────────────────────────────────

describe('AutocompleteEditor', () => {
  interface Combo {
    readonly editor: AutocompleteEditor;
    readonly input: HTMLInputElement;
    readonly listbox: HTMLElement;
    readonly changes: unknown[];
    /** The session's `commit`, so "one gesture, one commit" can be asserted. */
    readonly commit: ReturnType<typeof vi.fn>;
    readonly cancel: ReturnType<typeof vi.fn>;
    readonly options: () => readonly HTMLElement[];
  }

  function combo(
    params: Record<string, unknown> = {},
    value: unknown = null,
    colDef: Partial<ColumnDef> = { dropdownOptions: [...OPTIONS] },
  ): Combo {
    const changes: unknown[] = [];
    const commit = vi.fn();
    const cancel = vi.fn();
    const editor = mount(
      new AutocompleteEditor(),
      makeParams({
        value,
        colDef: makeColDef(colDef),
        params,
        onValueChange: (v: unknown) => changes.push(v),
        commit,
        cancel,
      }) as never,
    );
    editor.afterGuiAttached();

    const gui = editor.getGui();
    const listbox = gui.querySelector('[role="listbox"]') as HTMLElement;

    return {
      editor,
      input: gui.querySelector('input') as HTMLInputElement,
      listbox,
      changes,
      commit,
      cancel,
      options: () => Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')),
    };
  }

  const type = (target: Combo, text: string): void => {
    target.input.value = text;
    fire(target.input, 'input');
  };

  it('is a popup and wires the combobox ARIA pattern', () => {
    const { editor, input, listbox } = combo();

    expect(editor.isPopup()).toBe(true);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(input.getAttribute('aria-label')).toBe('Field');
    expect(listbox.id).not.toBe('');
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('marks every option with a role, and the cell\'s own value as selected', () => {
    const empty = combo();

    expect(empty.options().map((option) => option.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'false',
    ]);
    expect(empty.options().every((option) => option.id !== '')).toBe(true);

    // The search box opens empty, so `aria-selected` has to track the *cell's
    // value* rather than the field's text — otherwise a screen-reader user
    // browsing the list is never told which option is already chosen.
    const target = combo({}, 'beta');
    expect(target.options().map((option) => option.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);

    // Filtering must not lose it.
    type(target, 'be');
    expect(target.options().map((option) => option.getAttribute('aria-selected'))).toEqual([
      'true',
    ]);
  });

  it('opens with an empty search box and the full option list', () => {
    const target = combo({}, 'beta');

    // Bug B: seeding the box with the current value filtered the list to the one
    // option already chosen, so the user had to clear it before searching.
    expect(target.input.value).toBe('');
    expect(target.options().map((option) => option.textContent)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
    expect(target.listbox.hidden).toBe(false);
  });

  it('keeps the cell value until something else is picked, and can still clear it', () => {
    const target = combo({}, 'beta');

    // Untouched: an empty box means "unchanged", not "cleared".
    expect(target.editor.getValue()).toBe('beta');

    // Typed and then emptied: that is a deliberate clear.
    type(target, 'g');
    type(target, '');
    expect(target.editor.getValue()).toBeNull();
  });

  it('prompts to search rather than echoing the value, and honours an explicit hint', () => {
    // The box filters a list; showing the cell's value there read as pre-filled
    // text the user was about to overwrite. The current choice is still carried
    // by aria-selected in the list, so nothing is hidden by the change.
    expect(combo({}, 'beta').input.placeholder).toBe('Search…');
    expect(combo().input.placeholder).toBe('Search…');
    expect(combo({ placeholder: 'Find a customer' }, 'beta').input.placeholder).toBe(
      'Find a customer',
    );
  });

  it('still seeds itself with the character that opened a type session', () => {
    const editor = mount(
      new AutocompleteEditor(),
      makeParams({
        value: 'beta',
        colDef: makeColDef({ dropdownOptions: [...OPTIONS] }),
        trigger: 'type',
        eventKey: 'g',
      }) as never,
    );

    expect((editor.getGui().querySelector('input') as HTMLInputElement).value).toBe('g');
  });

  it('has no aria-activedescendant until an option is active', () => {
    const target = combo();

    expect(target.input.hasAttribute('aria-activedescendant')).toBe(false);

    press(target.input, 'ArrowDown');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[0].id);

    // Re-filtering rebuilds every option id, so a stale pointer would name an
    // element that no longer exists.
    type(target, 'be');
    expect(target.input.hasAttribute('aria-activedescendant')).toBe(false);

    press(target.input, 'ArrowDown');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[0].id);

    press(target.input, 'Escape');
    expect(target.input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('announces the result count in a visually-hidden live region', () => {
    const target = combo();
    const status = target.editor.getGui().querySelector('.pg-editor-sr-only') as HTMLElement;

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('3 results available.');

    type(target, 'be');
    expect(status.textContent).toBe('1 result available.');

    type(target, 'zzz');
    expect(status.textContent).toBe('No results available.');

    press(target.input, 'Escape');
    expect(status.textContent).toBe('');
  });

  it('opens showing every option, and filters as the user types', () => {
    const target = combo();
    expect(target.options()).toHaveLength(3);

    type(target, 'a');
    expect(target.options().map((option) => option.textContent)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);

    type(target, 'be');
    expect(target.options().map((option) => option.textContent)).toEqual(['Beta']);
  });

  it('matches case-insensitively unless told otherwise', () => {
    const insensitive = combo();
    type(insensitive, 'BETA');
    expect(insensitive.options()).toHaveLength(1);

    const sensitive = combo({ caseSensitive: true });
    type(sensitive, 'BETA');
    expect(sensitive.options()).toHaveLength(0);
    expect(sensitive.listbox.textContent).toBe('No matches');
  });

  it('navigates with the arrow keys and selects with Enter', () => {
    const target = combo();

    press(target.input, 'ArrowDown');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[0].id);

    press(target.input, 'ArrowDown');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[1].id);

    press(target.input, 'ArrowUp');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[0].id);

    const enter = press(target.input, 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(target.input.value).toBe('Alpha');
    expect(target.editor.getValue()).toBe('alpha');
    expect(target.listbox.hidden).toBe(true);
    expect(target.changes.at(-1)).toBe('alpha');
  });

  it('picks the active option and closes the cell in a single Enter', () => {
    const target = combo();

    press(target.input, 'ArrowDown');
    press(target.input, 'Enter');

    // One gesture, one commit: selecting without committing was what made the
    // user press Enter twice.
    expect(target.commit).toHaveBeenCalledTimes(1);
    expect(target.editor.getValue()).toBe('alpha');

    // A trailing Enter against the now-closing session must not commit again.
    press(target.input, 'Enter');
    expect(target.commit).toHaveBeenCalledTimes(1);
  });

  it('picks the clicked option and closes the cell in a single click', () => {
    const target = combo();

    fire(target.options()[1], 'mousedown');

    // Clicking an option *is* the choice: leaving the editor open afterwards
    // left the user having chosen but still stuck in the cell.
    expect(target.commit).toHaveBeenCalledTimes(1);
    expect(target.editor.getValue()).toBe('beta');
    expect(target.listbox.hidden).toBe(true);
  });

  it('commits only once when two options are clicked in quick succession', () => {
    // The second mousedown lands while the first commit is still tearing the
    // session down; `requestCommit` is one-shot, and this pins that.
    const target = combo();

    fire(target.options()[1], 'mousedown');
    fire(target.options()[2], 'mousedown');

    expect(target.commit).toHaveBeenCalledTimes(1);
  });

  it('takes the highlighted option on Tab without committing, so the grid can move on', () => {
    const target = combo();

    press(target.input, 'ArrowDown');
    press(target.input, 'Tab');

    expect(target.editor.getValue()).toBe('alpha');
    // Tab's purpose is navigation; the grid's own binding owns what happens next.
    expect(target.commit).not.toHaveBeenCalled();
  });

  it('commits typed text on Enter when freeSolo is on', () => {
    const target = combo({ freeSolo: true });
    type(target, 'delta');

    const enter = press(target.input, 'Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(target.commit).toHaveBeenCalledTimes(1);
    expect(target.editor.getValue()).toBe('delta');
    expect(target.listbox.hidden).toBe(true);
  });

  it('leaves Enter to the grid for unmatched text when freeSolo is off', () => {
    const target = combo();
    type(target, 'delta');

    const enter = press(target.input, 'Enter');

    // The grid commits, and `validate()` is what rejects it — the editor must
    // not short-circuit that path.
    expect(enter.defaultPrevented).toBe(false);
    expect(target.commit).not.toHaveBeenCalled();
  });

  it('wraps the active option at both ends', () => {
    const target = combo();

    press(target.input, 'ArrowUp');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[2].id);

    press(target.input, 'ArrowDown');
    expect(target.input.getAttribute('aria-activedescendant')).toBe(target.options()[0].id);
  });

  it('leaves Enter to the grid when the list is closed', () => {
    const target = combo();
    press(target.input, 'Escape');

    const enter = press(target.input, 'Enter');
    expect(enter.defaultPrevented).toBe(false);
  });

  it('closes the list on the first Escape and cancels the edit on the second', () => {
    const target = combo();

    const first = press(target.input, 'Escape');
    expect(first.defaultPrevented).toBe(true);
    expect(target.listbox.hidden).toBe(true);
    expect(target.input.getAttribute('aria-expanded')).toBe('false');
    // The first press dismisses the list only — the edit is still live, which is
    // the whole point of the layered dismissal.
    expect(target.cancel).not.toHaveBeenCalled();

    const second = press(target.input, 'Escape');
    // Not consumed, so it reaches the grid's own Escape binding and cancels.
    expect(second.defaultPrevented).toBe(false);
  });

  it('rejects text matching no option when freeSolo is off', () => {
    const target = combo();
    type(target, 'delta');

    const result = target.editor.validate();
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.code).toBe('autocomplete-no-match');
  });

  it('accepts free text when freeSolo is on', () => {
    const target = combo({ freeSolo: true });
    type(target, 'delta');

    expect(target.editor.validate().valid).toBe(true);
    expect(target.editor.getValue()).toBe('delta');
  });

  it('leaves emptiness to the required rule', () => {
    const target = combo();
    type(target, '');

    expect(target.editor.validate().valid).toBe(true);
    expect(target.editor.getValue()).toBeNull();
  });

  it('waits for minChars before opening', () => {
    const target = combo({ minChars: 2 });
    expect(target.listbox.hidden).toBe(true);

    type(target, 'a');
    expect(target.listbox.hidden).toBe(true);

    type(target, 'al');
    expect(target.listbox.hidden).toBe(false);
  });

  it('caps the rendered list at maxResults', () => {
    const target = combo({ maxResults: 2 });

    expect(target.options()).toHaveLength(2);
  });

  describe('remote options', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces the fetch and renders only the newest response', async () => {
      vi.useFakeTimers();

      const deferred = (): {
        promise: Promise<readonly ColumnDropdownOption[]>;
        resolve: (options: readonly ColumnDropdownOption[]) => void;
      } => {
        let resolve: (options: readonly ColumnDropdownOption[]) => void = () => undefined;
        const promise = new Promise<readonly ColumnDropdownOption[]>((r) => {
          resolve = r;
        });
        return { promise, resolve };
      };

      const stale = deferred();
      const fresh = deferred();
      const queue = [stale, fresh];
      const fetchOptions = vi.fn(() => queue.shift()!.promise);

      const target = combo({ fetchOptions, debounceMs: 10 }, null, {});

      type(target, 'a');
      type(target, 'ab');
      expect(fetchOptions).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(10);
      expect(fetchOptions).toHaveBeenCalledTimes(1);
      expect(fetchOptions).toHaveBeenLastCalledWith('ab');

      type(target, 'abc');
      await vi.advanceTimersByTimeAsync(10);
      expect(fetchOptions).toHaveBeenCalledTimes(2);

      // The superseded request answers last, and must be ignored.
      fresh.resolve([{ value: 'fresh', label: 'Fresh' }]);
      await vi.advanceTimersByTimeAsync(0);
      stale.resolve([{ value: 'stale', label: 'Stale' }]);
      await vi.advanceTimersByTimeAsync(0);

      expect(target.options().map((option) => option.textContent)).toEqual(['Fresh']);
    });

    it('shows an empty list rather than trapping the user when a lookup fails', async () => {
      vi.useFakeTimers();

      const fetchOptions = vi.fn(() => Promise.reject(new Error('offline')));
      const target = combo({ fetchOptions, debounceMs: 0 }, null, {});

      type(target, 'a');
      await vi.advanceTimersByTimeAsync(1);

      expect(target.options()).toHaveLength(0);
      expect(target.listbox.textContent).toBe('No matches');
    });

    it('drops a response that lands after the session was destroyed', async () => {
      vi.useFakeTimers();

      const late = { resolve: (): void => undefined };
      const promise = new Promise<readonly ColumnDropdownOption[]>((resolve) => {
        late.resolve = () => resolve([{ value: 'late', label: 'Late' }]);
      });
      const target = combo({ fetchOptions: () => promise, debounceMs: 0 }, null, {});

      type(target, 'a');
      await vi.advanceTimersByTimeAsync(1);

      target.editor.destroy();
      late.resolve();
      await vi.advanceTimersByTimeAsync(0);

      expect(target.options()).toHaveLength(0);
    });

    /**
     * A remote list can take a second or more to arrive. Until this, the
     * dropdown opened onto "No matches" and sat there — indistinguishable from
     * a lookup that had finished and found nothing, so users double-clicked
     * again on an editor that was already open.
     */
    it('shows a spinner from the moment the list opens until the options land', async () => {
      vi.useFakeTimers();

      let resolve: (options: readonly ColumnDropdownOption[]) => void = () => undefined;
      const fetchOptions = vi.fn(
        () => new Promise<readonly ColumnDropdownOption[]>((r) => { resolve = r; }),
      );
      const target = combo({ fetchOptions, debounceMs: 200 }, null, {});

      // Waiting already — the debounce window is part of the wait, so the
      // spinner must not hold back for it.
      const spinner = (): Element | null => target.listbox.querySelector('.pg-editor-spinner');
      expect(spinner()).not.toBeNull();
      expect(target.listbox.getAttribute('aria-busy')).toBe('true');
      expect(target.input.getAttribute('aria-expanded')).toBe('true');
      // The waiting row is not an option: it cannot be chosen, and counting it
      // would have the live region announce a result that does not exist.
      expect(target.options()).toHaveLength(0);
      expect(target.listbox.textContent).toContain('Loading…');

      await vi.advanceTimersByTimeAsync(200);
      expect(fetchOptions).toHaveBeenCalledTimes(1);
      expect(spinner()).not.toBeNull();

      resolve([{ value: 'ada', label: 'Ada Lovelace' }]);
      await vi.advanceTimersByTimeAsync(0);

      expect(spinner()).toBeNull();
      expect(target.listbox.hasAttribute('aria-busy')).toBe(false);
      expect(target.options().map((option) => option.textContent)).toEqual(['Ada Lovelace']);
    });

    it('clears the spinner when the lookup fails', async () => {
      vi.useFakeTimers();

      const fetchOptions = vi.fn(() => Promise.reject(new Error('offline')));
      const target = combo({ fetchOptions, debounceMs: 0 }, null, {});
      await vi.advanceTimersByTimeAsync(1);

      expect(target.listbox.querySelector('.pg-editor-spinner')).toBeNull();
      expect(target.listbox.textContent).toBe('No matches');
    });

    /**
     * The reported failure: a spinner covering an option the user could already
     * see. A list that fits in the browser should be fetched once and filtered
     * there — every keystroke going back to the server is both slower and,
     * visibly, a lie about what is known.
     */
    it('fetches once and filters locally in client mode', async () => {
      vi.useFakeTimers();

      const fetchOptions = vi.fn(() =>
        Promise.resolve([
          { value: 'ada', label: 'Ada Lovelace' },
          { value: 'grace', label: 'Grace Hopper' },
        ]),
      );
      const target = combo(
        { fetchOptions, searchMode: 'client', debounceMs: 0 }, null, {},
      );
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchOptions).toHaveBeenCalledTimes(1);

      type(target, 'grace');
      // No second request, and — the point of the whole thing — no spinner over
      // a list that is already on screen.
      expect(fetchOptions).toHaveBeenCalledTimes(1);
      expect(target.listbox.querySelector('.pg-editor-spinner')).toBeNull();
      expect(target.options().map((o) => o.textContent)).toEqual(['Grace Hopper']);
    });

    it('goes back to the server for every keystroke in server mode', async () => {
      vi.useFakeTimers();

      const fetchOptions = vi.fn(() => Promise.resolve([{ value: 'a', label: 'A' }]));
      const target = combo({ fetchOptions, searchMode: 'server', debounceMs: 0 }, null, {});
      await vi.advanceTimersByTimeAsync(1);

      type(target, 'x');
      await vi.advanceTimersByTimeAsync(1);

      // Correct when the browser cannot hold the list: only the server knows
      // whether anything matches.
      expect(fetchOptions).toHaveBeenCalledTimes(2);
      expect(fetchOptions).toHaveBeenLastCalledWith('x');
    });
  });

  /**
   * Large lists: the DOM must stay small, and the next page must arrive on
   * demand rather than up front.
   */
  describe('large option lists', () => {
    const many = (count: number): ColumnDropdownOption[] =>
      Array.from({ length: count }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

    it('renders a bounded window over a list far larger than the popup', () => {
      const target = combo({ options: many(10_000), virtualScroll: true });

      const rendered = target.options().length;
      // Bounded by the popup's height, not by the option count — the whole
      // point. Ten thousand rows would take a hundred times as long to build
      // and would be scrolled past, not read.
      expect(rendered).toBeGreaterThan(0);
      expect(rendered).toBeLessThan(60);
      // Every match is still reachable: the cap that protects a plain list is
      // exactly the cost virtualisation removes.
      expect(target.listbox.textContent).toContain('Option 0');
    });

    it('tells assistive technology the real size of a windowed list', () => {
      const target = combo({ options: many(1000), virtualScroll: true });
      const first = target.options()[0];

      // Without this a screen reader announces "1 of 20" over a list of a
      // thousand, because only twenty rows exist.
      expect(first.getAttribute('aria-setsize')).toBe('1000');
      expect(first.getAttribute('aria-posinset')).toBe('1');
    });

    it('builds a short list whole, with no virtual scaffolding', () => {
      const target = combo({ options: many(5) });

      expect(target.options()).toHaveLength(5);
      expect(target.listbox.querySelector('.pg-editor-listbox__window')).toBeNull();
    });

    it('asks for the next page when the list is scrolled to its end', async () => {
      const pages = [
        Array.from({ length: 50 }, (_, i) => ({ value: `p1-${i}`, label: `First ${i}` })),
        Array.from({ length: 10 }, (_, i) => ({ value: `p2-${i}`, label: `Second ${i}` })),
      ];
      const loadMore = vi.fn(() => Promise.resolve(pages.shift() ?? []));

      const target = combo({ options: many(20), loadMore, pageSize: 50 });
      target.listbox.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
      await Promise.resolve();

      expect(loadMore).toHaveBeenCalledTimes(1);
      expect(loadMore.mock.calls[0][0]).toMatchObject({ offset: 20, pageSize: 50 });

      // A short page ends the sequence, so no further request is made — one
      // fewer round trip than asking again to be told there is nothing left.
      target.listbox.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
      await Promise.resolve();
      target.listbox.dispatchEvent(new Event('scroll'));
      await Promise.resolve();
      await Promise.resolve();

      expect(loadMore).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * Multi-select: a tick per option, a check-all over what the search has
   * narrowed the list to, and an array on the way out.
   */
  describe('multiple', () => {
    const multi = (params: Record<string, unknown> = {}, value: unknown = null): Combo =>
      combo({ multiple: true, ...params }, value);

    /** The check-all input, which lives outside the listbox. */
    const selectAll = (target: Combo): HTMLInputElement =>
      target.editor.getGui().querySelector('.pg-editor-selectall__box') as HTMLInputElement;

    /** The check-all row, which owns the toggle. */
    const selectAllRow = (target: Combo): HTMLElement =>
      target.editor.getGui().querySelector('.pg-editor-selectall') as HTMLElement;

    /**
     * Pressing the check-all, as a browser delivers it: the press, then the
     * click that would have activated the checkbox.
     */
    const pressSelectAll = (target: Combo): void => {
      const row = selectAllRow(target);
      row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    };

    /** Clicking an option, exactly as the delegated listener receives it. */
    const clickOption = (target: Combo, index: number): void => {
      target.options()[index].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    };

    it('announces itself as multi-selectable and gives every option a tick', () => {
      const target = multi();

      expect(target.listbox.getAttribute('aria-multiselectable')).toBe('true');
      for (const option of target.options()) {
        expect(option.querySelector('.pg-editor-option__check')).not.toBeNull();
      }
      // The tick is decoration over `aria-selected`, never a second control the
      // user could focus or find in the accessibility tree.
      expect(target.listbox.querySelectorAll('input')).toHaveLength(0);
    });

    it('adds and removes values without closing the list', () => {
      const target = multi();

      clickOption(target, 0);
      clickOption(target, 2);

      expect(target.editor.getValue()).toEqual(['alpha', 'gamma']);
      // The whole point: a multi-select that committed on the first pick would
      // make the second cost another double-click.
      expect(target.commit).not.toHaveBeenCalled();
      expect(target.input.getAttribute('aria-expanded')).toBe('true');
      expect(target.options()[0].getAttribute('aria-selected')).toBe('true');

      clickOption(target, 0);
      expect(target.editor.getValue()).toEqual(['gamma']);
      expect(target.options()[0].getAttribute('aria-selected')).toBe('false');
    });

    it('opens with the cell\'s existing values ticked', () => {
      const target = multi({}, ['alpha', 'gamma']);

      expect(target.options().map((o) => o.getAttribute('aria-selected'))).toEqual([
        'true', 'false', 'true',
      ]);
      // Untouched, it commits what it opened with rather than an empty array.
      expect(target.editor.getValue()).toEqual(['alpha', 'gamma']);
    });

    it('accepts a single stored value, so a column switched to multiple keeps it', () => {
      expect(multi({}, 'beta').editor.getValue()).toEqual(['beta']);
    });

    it('checks all the options the search has narrowed the list to', () => {
      const target = multi();
      type(target, 'a');
      const shown = target.options().length;
      expect(shown).toBeGreaterThan(0);

      pressSelectAll(target);

      expect(target.editor.getValue()).toHaveLength(shown);
      expect(target.options().every((o) => o.getAttribute('aria-selected') === 'true')).toBe(true);
    });

    /**
     * The reported failure: one press selected everything and cleared it again.
     *
     * The row was a `<label>`, so the browser re-dispatched the click onto the
     * checkbox it wrapped — the handler ran, and then the input's own
     * activation ran the handler a second time. Two toggles, one press, no
     * visible effect.
     */
    it('toggles once per press, not twice', () => {
      const target = multi();
      const shown = target.options().length;

      pressSelectAll(target);
      expect(target.editor.getValue()).toHaveLength(shown);

      pressSelectAll(target);
      expect(target.editor.getValue()).toEqual([]);
    });

    it('reports a partial selection as indeterminate, not as unchecked', () => {
      const target = multi();
      const box = selectAll(target);

      expect(box.checked).toBe(false);
      expect(box.indeterminate).toBe(false);

      clickOption(target, 0);
      // Two states cannot tell "some" from "none", and a check-all that claimed
      // "none" would untick nothing on the next press.
      expect(box.indeterminate).toBe(true);
      expect(box.checked).toBe(false);

      clickOption(target, 1);
      clickOption(target, 2);
      expect(box.indeterminate).toBe(false);
      expect(box.checked).toBe(true);
    });

    it('unticks everything shown when pressed while fully checked', () => {
      const target = multi({}, ['alpha', 'beta', 'gamma']);
      const box = selectAll(target);
      expect(box.checked).toBe(true);

      pressSelectAll(target);

      expect(target.editor.getValue()).toEqual([]);
      expect(box.checked).toBe(false);
    });

    /**
     * Reopening a cell must show what it holds. Only a `type: 'array'` column
     * keeps the array — every other type stringifies it — so a multi-select
     * that could not read its own committed text opened blank and silently
     * discarded the user's selection the moment they looked at the cell again.
     */
    it('reads back a selection the column stored as text', () => {
      const target = multi({}, 'alpha,gamma');

      expect(target.editor.getValue()).toEqual(['alpha', 'gamma']);
      expect(target.options().map((o) => o.getAttribute('aria-selected'))).toEqual([
        'true', 'false', 'true',
      ]);
    });

    it('honours a separator the column declares', () => {
      const target = multi({ separator: ' | ' }, 'alpha | beta');

      expect(target.editor.getValue()).toEqual(['alpha', 'beta']);
    });

    it('keeps a value that contains the separator whole when it names an option', () => {
      const colDef = { dropdownOptions: [{ value: 'a,b', label: 'A and B' }, ...OPTIONS] };
      const target = combo({ multiple: true }, 'a,b', colDef);

      // Splitting this would invent two values the list has never heard of.
      expect(target.editor.getValue()).toEqual(['a,b']);
    });

    it('never rejects the search text, which is only ever a filter', () => {
      const target = multi();
      type(target, 'not an option at all');

      // Single-select would refuse this. Here the text selects nothing, so
      // there is nothing to be wrong about.
      expect(target.editor.validate()).toEqual({ valid: true });
      expect(target.editor.getValue()).toEqual([]);
    });

    it('disables the check-all while a remote list is loading', async () => {
      vi.useFakeTimers();
      try {
        const fetchOptions = vi.fn(() => new Promise<readonly ColumnDropdownOption[]>(() => undefined));
        const target = multi({ fetchOptions, debounceMs: 0 });

        // Nothing on screen is not something "select all" can act on.
        expect(selectAll(target).disabled).toBe(true);
        await vi.advanceTimersByTimeAsync(1);
        expect(selectAll(target).disabled).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
