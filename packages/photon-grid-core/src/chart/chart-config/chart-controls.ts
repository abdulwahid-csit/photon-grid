/**
 * Small, theme-token-styled form-control primitives used to build the chart
 * configuration tool panel. Each factory returns a ready-to-mount element and
 * wires a single `onChange` callback. No control writes inline styles — all
 * appearance comes from `chart-controls.css.ts`.
 */

const ICON_CHEVRON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const ICON_DRAG = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></svg>`;
const ICON_X = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/** Wraps a control in a labelled row. */
function labelledRow(labelText: string, control: HTMLElement): HTMLElement {
  const row = document.createElement('label');
  row.className = 'pg-chart-ctrl__row';
  const label = document.createElement('span');
  label.className = 'pg-chart-ctrl__label';
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(control);
  return row;
}

/** A `<select>` dropdown. */
export function createDropdown(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  onChange: (value: string) => void,
  label?: string,
): HTMLElement {
  const select = document.createElement('select');
  select.className = 'pg-chart-ctrl__select';
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  return label ? labelledRow(label, select) : select;
}

/** A switch-style boolean toggle. */
export function createToggle(checked: boolean, onChange: (checked: boolean) => void, label: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'pg-chart-ctrl__row';
  const span = document.createElement('span');
  span.className = 'pg-chart-ctrl__label';
  span.textContent = label;

  const track = document.createElement('button');
  track.type = 'button';
  track.className = 'pg-chart-ctrl__toggle';
  track.setAttribute('role', 'switch');
  track.setAttribute('aria-checked', String(checked));
  track.classList.toggle('pg-chart-ctrl__toggle--on', checked);
  const knob = document.createElement('span');
  knob.className = 'pg-chart-ctrl__toggle-knob';
  track.appendChild(knob);

  track.addEventListener('click', () => {
    const next = !track.classList.contains('pg-chart-ctrl__toggle--on');
    track.classList.toggle('pg-chart-ctrl__toggle--on', next);
    track.setAttribute('aria-checked', String(next));
    onChange(next);
  });

  row.appendChild(span);
  row.appendChild(track);
  return row;
}

/** A color swatch backed by a native color input. */
export function createColorInput(value: string, onChange: (value: string) => void, label: string): HTMLElement {
  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'pg-chart-ctrl__color';
  if (value) input.value = value;
  input.addEventListener('input', () => onChange(input.value));
  return labelledRow(label, input);
}

/** A numeric input with optional bounds and step. */
export function createNumberInput(
  value: number,
  onChange: (value: number) => void,
  label: string,
  min?: number,
  max?: number,
  step?: number,
): HTMLElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'pg-chart-ctrl__input';
  input.value = String(value);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  if (step !== undefined) input.step = String(step);
  input.addEventListener('input', () => {
    const n = Number(input.value);
    if (!Number.isNaN(n)) onChange(n);
  });
  return labelledRow(label, input);
}

/** A single-line text input. */
export function createTextInput(
  value: string,
  onChange: (value: string) => void,
  label: string,
  placeholder = '',
): HTMLElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'pg-chart-ctrl__input';
  input.value = value;
  input.placeholder = placeholder;
  input.addEventListener('input', () => onChange(input.value));
  return labelledRow(label, input);
}

/** A segmented button group (single selection). */
export function createSegmented(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  onChange: (value: string) => void,
  label?: string,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'pg-chart-ctrl__segmented';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pg-chart-ctrl__segment';
    btn.textContent = opt.label;
    btn.classList.toggle('pg-chart-ctrl__segment--active', opt.value === value);
    btn.addEventListener('click', () => {
      for (const child of Array.from(group.children)) {
        child.classList.remove('pg-chart-ctrl__segment--active');
      }
      btn.classList.add('pg-chart-ctrl__segment--active');
      onChange(opt.value);
    });
    group.appendChild(btn);
  }
  return label ? labelledRow(label, group) : group;
}

/**
 * A collapsible section with a header toggle. Returns the outer `section` and
 * the `body` element callers append content to.
 */
export function createCollapsibleSection(
  title: string,
  expanded = false,
): { section: HTMLElement; body: HTMLElement } {
  const section = document.createElement('div');
  section.className = 'pg-chart-ctrl__section';

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'pg-chart-ctrl__section-header';
  const chevron = document.createElement('span');
  chevron.className = 'pg-chart-ctrl__section-chevron';
  chevron.innerHTML = ICON_CHEVRON;
  const titleEl = document.createElement('span');
  titleEl.textContent = title;
  header.appendChild(chevron);
  header.appendChild(titleEl);

  const body = document.createElement('div');
  body.className = 'pg-chart-ctrl__section-body';

  section.classList.toggle('pg-chart-ctrl__section--open', expanded);
  header.addEventListener('click', () => {
    section.classList.toggle('pg-chart-ctrl__section--open');
  });

  section.appendChild(header);
  section.appendChild(body);
  return { section, body };
}

/** An item in a {@link createReorderableList}. */
export interface ReorderListItem {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

/**
 * A drag-to-reorder list with per-item remove buttons. Reordering uses a pointer
 * drag (mousedown/move/up), not HTML5 DnD, to match the chart panel's own drag
 * handling and avoid ghost-image quirks.
 *
 * @param items - Items in current order.
 * @param onReorder - Called with the new id order after a drag.
 * @param onRemove - Called with an item id when its remove button is clicked.
 */
export function createReorderableList(
  items: readonly ReorderListItem[],
  onReorder: (orderedIds: string[]) => void,
  onRemove: (id: string) => void,
): HTMLElement {
  const list = document.createElement('div');
  list.className = 'pg-chart-ctrl__list';

  const order = items.map((it) => it.id);

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'pg-chart-ctrl__list-item';
    row.dataset['id'] = item.id;

    const handle = document.createElement('span');
    handle.className = 'pg-chart-ctrl__list-handle';
    handle.innerHTML = ICON_DRAG;

    if (item.color) {
      const swatch = document.createElement('span');
      swatch.className = 'pg-chart-ctrl__list-swatch';
      swatch.style.setProperty('--pg-chart-swatch', item.color);
      row.appendChild(handle);
      row.appendChild(swatch);
    } else {
      row.appendChild(handle);
    }

    const label = document.createElement('span');
    label.className = 'pg-chart-ctrl__list-label';
    label.textContent = item.label;
    row.appendChild(label);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'pg-chart-ctrl__list-remove';
    remove.innerHTML = ICON_X;
    remove.addEventListener('click', () => onRemove(item.id));
    row.appendChild(remove);

    attachRowDrag(row, list, order, onReorder);
    list.appendChild(row);
  });

  return list;
}

/** Wires pointer-based reordering for a single list row. */
function attachRowDrag(
  row: HTMLElement,
  list: HTMLElement,
  order: string[],
  onReorder: (orderedIds: string[]) => void,
): void {
  const handle = row.querySelector('.pg-chart-ctrl__list-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    row.classList.add('pg-chart-ctrl__list-item--dragging');

    const onMove = (mv: MouseEvent): void => {
      const rows = Array.from(list.querySelectorAll('.pg-chart-ctrl__list-item')) as HTMLElement[];
      const after = rows.find((r) => {
        if (r === row) return false;
        const box = r.getBoundingClientRect();
        return mv.clientY < box.top + box.height / 2;
      });
      if (after) list.insertBefore(row, after);
      else list.appendChild(row);
    };

    const onUp = (): void => {
      row.classList.remove('pg-chart-ctrl__list-item--dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const newOrder = (Array.from(list.querySelectorAll('.pg-chart-ctrl__list-item')) as HTMLElement[])
        .map((r) => r.dataset['id'] ?? '')
        .filter((id) => id.length > 0);
      order.splice(0, order.length, ...newOrder);
      onReorder(newOrder);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
