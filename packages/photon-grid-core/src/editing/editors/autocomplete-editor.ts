/**
 * Type-ahead entry over a local or remote option list.
 *
 * @packageDocumentation
 */

import type { ColumnDropdownOption } from '../../types/column.types';
import { VALID, invalid, type ValidationResult } from '../types/validation.types';
import { AbstractCellEditor, type EditorParams } from './base/abstract-editor';

/**
 * Source of the unique `id` pairs that wire `aria-activedescendant` and
 * `aria-controls` together.
 *
 * Module-scoped and monotonic: two autocomplete cells can be open at once
 * (a popup mid-close while the next session opens), and duplicate ids would
 * point assistive technology at the wrong list.
 */
let sequence = 0;

/**
 * Hint shown in the search box when the column names none.
 *
 * The box is a *search field*, not a copy of the cell, so it says what it is
 * for. Echoing the current value there read as though the cell's contents had
 * been typed into the field and were about to be replaced — the user could not
 * tell a placeholder from real text, and the one thing the hint has to
 * communicate is "type here to filter". The current value is not lost by this:
 * it stays marked `aria-selected` in the list and is what {@link
 * AutocompleteEditor.getValue} returns until something else is chosen.
 */
const DEFAULT_SEARCH_PLACEHOLDER = 'Search…';

/**
 * Label on the check-all row, when the column names none.
 */
const DEFAULT_SELECT_ALL_TEXT = 'Select all';

/**
 * Shown beside the spinner while a remote lookup is in flight.
 *
 * Text as well as a spinner because a bare animation says "something is
 * happening" to a sighted user and nothing at all to anyone else — this is the
 * string the live region speaks.
 */
const DEFAULT_LOADING_TEXT = 'Loading…';

/**
 * Separator for a multi-select stored as text.
 *
 * A bare comma because that is what `String(['a','b'])` produces, and the
 * stringified array is exactly what a non-`array` column stores.
 */
const DEFAULT_SEPARATOR = ',';

/** Option rows above which the list virtualises itself. @see AutocompleteEditorParams.virtualScrollThreshold */
const DEFAULT_VIRTUAL_THRESHOLD = 150;

/** Height of one option row in px. @see AutocompleteEditorParams.rowHeight */
const DEFAULT_ROW_HEIGHT = 32;

/** Rows requested per {@link AutocompleteEditorParams.loadMore} call. */
const DEFAULT_PAGE_SIZE = 50;

/**
 * Rows rendered beyond each edge of the visible window.
 *
 * Without them a fast scroll shows blank strips where the browser has painted
 * before the scroll handler has run. Four is enough to cover a wheel flick at
 * 60fps and still bounds the live node count to something small.
 */
const VIRTUAL_OVERSCAN = 4;

/**
 * How close to the bottom, in rows, the list gets before the next page is
 * requested.
 *
 * Measured in rows rather than pixels so it means the same thing at any row
 * height: start loading while there is still a screenful to read.
 */
const LOAD_MORE_ROWS = 6;

/**
 * What an autocomplete cell commits.
 *
 * The array arm exists only for {@link AutocompleteEditorParams.multiple}. A
 * multi-select column should declare `type: 'array'`, which is the one column
 * type whose parser passes an array through intact; any other type stringifies
 * it on the way to the data.
 */
export type AutocompleteValue = string | number | null | readonly (string | number)[];

/**
 * The bag the {@link AutocompleteEditorParams.options} function form receives,
 * so a list can depend on the row being edited.
 */
export type AutocompleteOptionsContext = EditorParams<
  AutocompleteValue,
  AutocompleteEditorParams
>;

/** `cellEditorParams` for {@link AutocompleteEditor}. */
export interface AutocompleteEditorParams {
  /**
   * The local choices, either literal or computed per cell.
   *
   * Omit it and the editor falls back to `ColumnDef.dropdownOptions`, then to
   * `ColumnDef.enumOptions`. Can be combined with {@link fetchOptions}, which
   * replaces the list once a response arrives — useful for showing recent or
   * default choices before the user has typed anything.
   */
  readonly options?:
    | readonly ColumnDropdownOption[]
    | ((context: AutocompleteOptionsContext) => readonly ColumnDropdownOption[]);

  /**
   * Fetches choices for a query — the hook for a list too large to ship to the
   * browser.
   *
   * Calls are debounced by {@link debounceMs} and race-guarded, so only the
   * newest response is ever rendered. Results are shown exactly as returned,
   * *not* filtered again locally: the server has already decided what matches,
   * and re-filtering would quietly discard fuzzy or synonym hits it meant to
   * include.
   *
   * A rejection is not an error state — it empties the list and leaves the field
   * usable, because a failed lookup must never trap the user in a cell.
   */
  readonly fetchOptions?: (query: string) => Promise<readonly ColumnDropdownOption[]>;

  /**
   * Characters required before the list opens.
   *
   * @default 0 — a local list should show on first interaction. Raise it to 2
   *   or 3 for {@link fetchOptions}, where a one-character query matches most of
   *   the table and costs a round trip to say so.
   */
  readonly minChars?: number;

  /**
   * Quiet period before {@link fetchOptions} is called, in milliseconds.
   *
   * @default 200 — long enough that a typed word costs one request instead of
   *   one per keystroke, short enough to feel immediate.
   */
  readonly debounceMs?: number;

  /**
   * Accept text that matches no option.
   *
   * @default false, which is what makes this editor a *constrained* choice: the
   *   value is guaranteed to be one of the options, and {@link
   *   AutocompleteEditor.validate} blocks the commit otherwise. Set `true` for a
   *   field where the list is a convenience rather than a domain — tags, a
   *   free-form category.
   */
  readonly freeSolo?: boolean;

  /**
   * Match case-sensitively.
   *
   * @default false. Users do not capitalise consistently, and a list that hides
   *   the option they are looking at reads as broken.
   */
  readonly caseSensitive?: boolean;

  /**
   * Cap on rendered options.
   *
   * @default 50. A list nobody can scan is not more useful for being longer, and
   *   an unbounded filter over ten thousand options builds ten thousand
   *   elements on every keystroke.
   */
  readonly maxResults?: number;

  /**
   * Hint shown while the field is empty.
   *
   * @default 'Search…' — the box filters a list, and saying so is more use than
   *   echoing a value the user can already see marked in the list below. Set it
   *   to say something else when the column wants a more specific prompt
   *   ("Search customers", a format example).
   */
  readonly placeholder?: string;

  /** Message used when the text matches no option and `freeSolo` is off. */
  readonly noMatchMessage?: string;

  /** Text shown in place of the list when nothing matches. */
  readonly emptyText?: string;

  /**
   * Let the cell hold several options at once.
   *
   * Turns every option into a checkbox row, adds a check-all control under the
   * search box, and makes {@link AutocompleteEditor.getValue} return an array.
   * Choosing an option toggles it and leaves the list open — a multi-select
   * that closed on the first pick would make the second choice cost another
   * double-click.
   *
   * Declare the column as `type: 'array'`: it is the only type whose parser
   * passes an array through to the data unchanged.
   *
   * @default false
   */
  readonly multiple?: boolean;

  /** Label on the check-all row. @default 'Select all' */
  readonly selectAllText?: string;

  /** Text shown beside the spinner while {@link fetchOptions} is running. @default 'Loading…' */
  readonly loadingText?: string;

  /**
   * Separator used to read a multi-select back out of a column that stores it
   * as text.
   *
   * Only a `type: 'array'` column keeps the array; every other type stringifies
   * it, and this is how the pieces are recognised again when the cell is
   * reopened. It must match what the stringified array produces, which is why
   * the default is a bare comma.
   *
   * @default ','
   */
  readonly separator?: string;

  /**
   * Where filtering happens.
   *
   * - `'client'` — the browser filters the list it already has. Typing costs
   *   nothing and never shows a spinner.
   * - `'server'` — every keystroke goes to {@link fetchOptions}, debounced.
   *   Correct when the list is too large to hold, and the only mode that can
   *   find an option the browser has never seen.
   * - `'auto'` — `'server'` when a fetcher is configured, `'client'` otherwise.
   *
   * ### Why you may want `'client'` *with* a fetcher
   * A fetched list that fits in the browser is best fetched **once**, when the
   * editor opens, and filtered locally after that. Left in `'server'` mode, a
   * list already on screen still costs a round trip per keystroke, and the user
   * watches a spinner cover an option they can see.
   *
   * @default 'auto'
   */
  readonly searchMode?: 'client' | 'server' | 'auto';

  /**
   * Render only the options in view.
   *
   * Off, a list is built element by element; ten thousand options are ten
   * thousand nodes on every keystroke. On, the count of live nodes is bounded by
   * the height of the popup, so the list opens in the same time at ten options
   * or at a hundred thousand.
   *
   * @default true once the list passes {@link virtualScrollThreshold}, which is
   *   where building it whole starts to be measurable. Set `false` to force the
   *   simple path, `true` to virtualise from the first option.
   */
  readonly virtualScroll?: boolean;

  /**
   * Option count above which {@link virtualScroll} switches itself on.
   *
   * @default 150 — comfortably more than any list a user scans by eye, and well
   *   below where building the DOM whole becomes noticeable.
   */
  readonly virtualScrollThreshold?: number;

  /**
   * Height of one option row in px, used to place the virtual window.
   *
   * Must match what the stylesheet renders, which the editor enforces by
   * applying it to the rows it builds. Change it together with any theme that
   * restyles `.pg-editor-option`.
   *
   * @default 32
   */
  readonly rowHeight?: number;

  /**
   * Fetches the next page when the list is scrolled to its end.
   *
   * The hook for a list nobody should download whole: return the next slice and
   * it is appended. Returning fewer rows than asked for — or none — ends the
   * sequence, so there is no separate "no more data" flag to keep in step.
   *
   * Pages are appended to the options already held, and the guard against
   * re-entry is internal: scrolling hard at the bottom cannot stack requests.
   *
   * @example
   * ```ts
   * loadMore: ({ query, offset, pageSize }) =>
   *   fetch(`/api/owners?q=${query}&skip=${offset}&take=${pageSize}`).then((r) => r.json()),
   * ```
   */
  readonly loadMore?: (context: {
    readonly query: string;
    /** How many options are already held. */
    readonly offset: number;
    readonly pageSize: number;
  }) => Promise<readonly ColumnDropdownOption[]>;

  /** Rows requested per {@link loadMore} call. @default 50 */
  readonly pageSize?: number;
}

/**
 * Announces how many options the list is offering, for a user who cannot see it.
 *
 * A sighted user watches the list shrink as they type; a screen-reader user gets
 * nothing at all unless the count is spoken, and "is this filtering?" is not a
 * question they can otherwise answer. Kept deliberately terse — it is re-read on
 * every keystroke, so anything longer becomes noise the user turns off.
 *
 * @param count - Number of selectable options currently rendered.
 * @returns The sentence to place in the live region.
 */
function describeResults(count: number): string {
  if (count === 0) return 'No results available.';
  if (count === 1) return '1 result available.';
  return `${count} results available.`;
}

/**
 * A combobox: a text field that filters a list as you type, with full keyboard
 * operation and correct ARIA.
 *
 * ### Why it is a popup
 * The list is many rows tall and the grid clips its viewport, so an inline list
 * would be cut off at the first row boundary. Mounting in a portal is the only
 * way it can overlap the rows beneath it.
 *
 * ### Accessibility is the feature
 * A text input beside a styled `<div>` list is not a combobox to anyone using a
 * screen reader — it is an unlabelled text field next to some decorative text.
 * The wiring here is the ARIA 1.2 combobox pattern in full: `role="combobox"`
 * with `aria-expanded` and `aria-controls` on the input, a `role="listbox"` of
 * `role="option"` elements, `aria-selected` on the chosen one, and
 * `aria-activedescendant` naming the active option so arrowing through the list
 * is announced *without* focus ever leaving the field the user is typing in.
 * That last point is why the options are not focusable elements.
 *
 * `aria-activedescendant` is removed — not merely repointed — whenever there is
 * no active option, which includes every re-filter: the ids it names are rebuilt
 * on each keystroke, and an attribute left pointing at a deleted element leaves
 * assistive technology describing an option that is no longer on screen. A
 * visually-hidden live region carries the result count alongside it, because the
 * list shrinking as you type is otherwise a purely visual event.
 *
 * ### It opens empty, showing everything
 * The search box is *not* seeded with the cell's current value. Seeding it made
 * every session start with the list filtered down to the one option already
 * chosen, so browsing to a different one meant clearing the box first — the user
 * had to undo the editor's work before they could use it. Opening empty shows
 * the whole list immediately (subject to {@link
 * AutocompleteEditorParams.minChars}), and the current choice is not lost: it is
 * marked `aria-selected` in the list and remains what {@link getValue} returns
 * until the user picks or types something else. The box carries a `Search…`
 * hint rather than an echo of the value, because it is a filter and reading it
 * as pre-filled text was the more confusing of the two. An empty box therefore
 * means "unchanged", not "cleared" — clearing is typing something and deleting
 * it, which is the only gesture that can be told apart from never having typed
 * at all.
 *
 * ### Choosing is one gesture
 * Clicking an option, or pressing `Enter` on the highlighted one, selects it
 * *and* commits the cell — the editor closes and focus returns to the cell.
 * Anything less left the user having chosen but still stuck in the editor. With
 * {@link AutocompleteEditorParams.freeSolo} on, `Enter` over text that names no
 * option commits that text the same way. With the list closed and nothing
 * highlighted the key is left alone, so it keeps its grid-wide meaning.
 *
 * ### Escape closes the list before it cancels the edit
 * One `Escape` dismisses the list; a second cancels the session. Collapsing both
 * into one keystroke means a user who opened the list by accident loses their
 * edit to get rid of it — the same layered dismissal every native combobox uses.
 *
 * ### Remote lookups
 * `fetchOptions` is debounced and race-guarded by a monotonic token: a response
 * that arrives after a newer request was issued is dropped, so a slow query for
 * `"a"` can never overwrite the list for `"amsterdam"`. The pending timer and
 * the token are both cleared on {@link destroy}, so a session closed mid-flight
 * touches no DOM afterwards.
 *
 * @example
 * ```ts
 * {
 *   field: 'customerId',
 *   editable: true,
 *   cellEditor: 'autocomplete',
 *   cellEditorParams: {
 *     minChars: 2,
 *     debounceMs: 250,
 *     fetchOptions: async (query) => {
 *       const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`);
 *       return res.json();
 *     },
 *   },
 * }
 * ```
 */
export class AutocompleteEditor extends AbstractCellEditor<
  AutocompleteValue,
  AutocompleteEditorParams
> {
  private input!: HTMLInputElement;
  private listbox!: HTMLElement;

  /**
   * The check-all row, built only for {@link AutocompleteEditorParams.multiple}.
   *
   * Null in single-select mode rather than built-and-hidden: a hidden checkbox
   * is still in the accessibility tree's way, and the mode cannot change during
   * a session.
   */
  private selectAll: HTMLInputElement | null = null;

  /**
   * The visually-hidden live region carrying the result count.
   *
   * A separate element from the listbox on purpose: making the listbox itself
   * live would have every option re-announced on every keystroke, which is the
   * classic way a well-meaning `aria-live` renders a combobox unusable.
   */
  private status!: HTMLElement;

  /** The full candidate list — local, or whatever the last fetch returned. */
  private options: readonly ColumnDropdownOption[] = [];

  /** What the list is currently showing, and what the arrow keys walk. */
  private matches: readonly ColumnDropdownOption[] = [];

  /** Index into {@link matches}, or `-1` for "no active option". */
  private activeIndex = -1;

  /**
   * The value the editor would commit if it closed right now — the cell's own
   * value until the user chooses a different option.
   *
   * Held separately from the field's text because the two are no longer the same
   * thing: the text is a *search query* that starts empty, while this is the
   * *selection* that starts at whatever the cell holds. It is what
   * `aria-selected` marks in the list, so a screen-reader user browsing the
   * options is still told which one is currently chosen.
   *
   * Unused in {@link AutocompleteEditorParams.multiple} mode, where
   * {@link selected} carries the selection instead.
   */
  private selectedValue: string | number | null = null;

  /**
   * The chosen values in multi-select mode, keyed by their stringified form.
   *
   * A `Map` rather than a `Set` because two things are needed at once:
   * membership tested against the string form (a column may store `1` where its
   * option declares `'1'`, and a list that shows neither as ticked is the bug
   * users report), and the *original* typed values to commit. Insertion order is
   * the order the user picked them, which is the order they are written.
   */
  private readonly selected = new Map<string, string | number>();

  /**
   * Whether the user has typed in the search box at all this session.
   *
   * The one bit that separates "opened and left alone" from "deliberately
   * cleared", which an empty field alone cannot express now that the field opens
   * empty. Untouched, an empty field commits the cell's existing value; emptied
   * after typing, it commits `null`. Without this the mere act of opening a cell
   * and pressing `Enter` would wipe it — data loss caused by looking at a cell,
   * which is the worst class of grid bug.
   */
  private textEdited = false;

  private open = false;

  /**
   * Whether a remote lookup is outstanding.
   *
   * Set when the request is *scheduled*, not when it is sent: the debounce
   * window is part of the wait as far as the user is concerned, and a list that
   * says "No matches" for 200ms before the spinner appears reads as an answer
   * rather than as a pause.
   */
  private loading = false;

  /** Id of the listbox, and the stem of every option's id. */
  private listId = '';

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Monotonic request token; only the newest response may render. */
  private fetchToken = 0;

  /** Set by {@link destroy}, so an in-flight response cannot touch dead DOM. */
  private disposed = false;

  /**
   * Whether {@link AutocompleteEditorParams.fetchOptions} has answered once.
   *
   * The switch that makes client-side search possible over a remote list: the
   * first keystroke pulls the list, every one after it filters what arrived.
   * Left `false` by a failed lookup, so a dropped connection retries rather
   * than filtering an empty list for the rest of the session.
   */
  private fetchedOnce = false;

  /** The query the currently-held pages belong to. @see AutocompleteEditorParams.loadMore */
  private pagedQuery = '';

  /** `true` once {@link AutocompleteEditorParams.loadMore} has run dry. */
  private exhausted = false;

  /** Guards against stacking page requests while one is in flight. */
  private loadingMore = false;

  /** The scrolling window's spacer and viewport, when the list is virtualised. */
  private virtualSpacer: HTMLElement | null = null;
  private virtualWindow: HTMLElement | null = null;

  /** First option index currently in the DOM, for the virtual path. */
  private windowStart = -1;

  /** Larger than a cell, so it is mounted in a portal above the grid. */
  isPopup(): boolean {
    return true;
  }

  protected buildGui(): HTMLElement {
    this.listId = `pg-ac-${++sequence}`;
    this.options = this.resolveOptions();
    this.seedSelection();

    const gui = document.createElement('div');
    gui.className = 'pg-editor-combobox';

    this.input = this.buildInput();
    this.listbox = this.buildListbox();
    this.status = this.buildStatus();

    gui.appendChild(this.input);
    // Between the search box and the list, because it acts on what the search
    // has narrowed the list down to — reading top to bottom, "search, then
    // select all of these".
    if (this.isMultiple()) gui.appendChild(this.buildSelectAll());
    gui.appendChild(this.listbox);
    gui.appendChild(this.status);

    this.addDisposer(() => {
      this.disposed = true;
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    });

    return gui;
  }

  /** Whether this session is a multi-select one. */
  private isMultiple(): boolean {
    return this.editorParams().multiple === true;
  }

  /**
   * Reads the cell's value into the selection.
   *
   * Three shapes have to be understood, because all three are what a cell can
   * legitimately hold:
   *
   * - an **array**, from a `type: 'array'` column, which passes through intact;
   * - a **delimited string**, from every other column type — `parseValue` runs
   *   `String(raw)` over the committed array, so `['a','b']` comes back as
   *   `"a,b"`. Reading that as one opaque value is what made a reopened
   *   multi-select show nothing ticked, losing the user's selection the moment
   *   they looked at the cell again;
   * - a **lone value**, so a column switched to `multiple` after the fact still
   *   opens with what it already held.
   *
   * Entries are matched against the option list where possible, so a value that
   * legitimately contains the separator is not split apart behind the user's
   * back — the whole string wins when it names an option.
   */
  private seedSelection(): void {
    const value = this.params.value;

    if (this.isMultiple()) {
      for (const entry of this.readMultiValue(value)) this.selected.set(String(entry), entry);
      return;
    }

    this.selectedValue = (value ?? null) as string | number | null;
  }

  /** Normalises whatever the cell holds into the list of chosen values. */
  private readMultiValue(value: unknown): readonly (string | number)[] {
    if (Array.isArray(value)) return value as readonly (string | number)[];
    if (value === null || value === undefined || value === '') return [];

    if (typeof value === 'string') {
      // A string that names an option is that option, separator or not.
      if (this.findExactOption(value)) return [value];

      const separator = this.editorParams().separator ?? DEFAULT_SEPARATOR;
      const parts = value
        .split(separator)
        .map((part) => part.trim())
        .filter((part) => part !== '');
      if (parts.length > 0) return parts;
    }

    return [value as string | number];
  }

  /**
   * The committed value: every ticked option in multi-select mode, and
   * otherwise the matched option's value, the raw text, or — for a search box
   * the user never touched — the cell's existing value.
   *
   * That last case is what makes an empty box mean "unchanged" rather than
   * "cleared"; see {@link textEdited} for why the distinction has to be tracked
   * rather than read off the field. Raw text reaches the data only when
   * `freeSolo` is on — otherwise {@link validate} has already blocked the commit.
   */
  getValue(): AutocompleteValue {
    // The text is purely a filter in multi-select mode: what is ticked is what
    // is committed, and an unsubmitted query must not become a value.
    if (this.isMultiple()) return [...this.selected.values()];

    const text = this.input.value.trim();
    if (text === '') return this.textEdited ? null : this.selectedValue;

    const match = this.findExactOption(text);
    return match ? match.value : text;
  }

  /**
   * Rejects text that names no option, unless the column opted into free entry.
   *
   * Editor-local rather than a column rule because only the editor knows what
   * its list currently holds — after a remote fetch, that is not something a
   * declarative rule could have been given up front.
   */
  validate(): ValidationResult {
    // Nothing to reject: a multi-select commits its ticks, never its query, so
    // leftover text in the search box is not a value that could be wrong.
    if (this.isMultiple()) return VALID;
    if (this.editorParams().freeSolo === true) return VALID;

    const text = this.input.value.trim();
    // Emptiness is `validation.required`'s business, not this editor's; failing
    // it here would make every autocomplete column implicitly mandatory.
    if (text === '') return VALID;

    if (this.findExactOption(text)) return VALID;

    return invalid(
      this.editorParams().noMatchMessage ?? `"${text}" is not one of the available options`,
      'autocomplete-no-match',
    );
  }

  focus(): void {
    this.input.focus();
    if (this.params.trigger === 'type') {
      const end = this.input.value.length;
      this.input.setSelectionRange(end, end);
      return;
    }
    this.input.select();
  }

  /**
   * Opens the list once the popup is placed, so the choices are visible without
   * the user having to discover the arrow keys.
   *
   * Deferred to this hook rather than done in `init` because a list opened
   * before the popup has been measured and positioned would paint at the wrong
   * place first.
   */
  afterGuiAttached(): void {
    this.refreshMatches(this.input.value);
  }

  // ─── Construction ───────────────────────────────────────────────────────────

  /** Builds the text field, with the combobox half of the ARIA wiring. */
  private buildInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pg-editor pg-editor--autocomplete';
    input.value = this.initialText();
    input.autocomplete = 'off';
    input.spellcheck = false;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', this.listId);
    input.setAttribute('aria-haspopup', 'listbox');
    // The root is the combobox *group*, which the host labels; the field the
    // user types into needs its own name or it is announced unlabelled.
    input.setAttribute('aria-label', this.accessibleName());

    // The box searches; it does not mirror the cell. See the constant's note.
    input.placeholder = this.editorParams().placeholder ?? DEFAULT_SEARCH_PLACEHOLDER;

    this.on(input, 'input', () => this.onInput());
    this.on(input, 'keydown', (event) => this.onKeyDown(event));

    return input;
  }

  /**
   * Builds the list.
   *
   * One delegated `mousedown` listener serves every option — N listeners for N
   * options would be rebuilt on each keystroke — and it suppresses its default
   * action so the click never pulls focus out of the field, which would close
   * the session before the selection landed.
   *
   * Picking with the pointer *commits*, exactly as `Enter` on a highlighted
   * option does: clicking an option is the whole gesture, and leaving the editor
   * open on a list the user has just finished with made choosing take a click
   * and then a second, unrelated action to get out of the cell.
   */
  private buildListbox(): HTMLElement {
    const listbox = document.createElement('ul');
    listbox.className = 'pg-editor-listbox';
    listbox.id = this.listId;
    listbox.setAttribute('role', 'listbox');
    // Read by the stylesheet so a virtualised row is exactly as tall as the
    // window maths assume. Set as a variable rather than on each row: one
    // declaration the theme can still override per grid, and no per-row style.
    listbox.style.setProperty('--pg-ac-row-height', `${this.rowHeight()}px`);
    // Tells assistive technology that ticking one option does not untick the
    // last — without it a multi-select is announced as an ordinary listbox and
    // the checkbox affordance is a purely visual claim.
    if (this.isMultiple()) listbox.setAttribute('aria-multiselectable', 'true');
    listbox.hidden = true;

    this.on(listbox, 'mousedown', (event) => {
      event.preventDefault();
      const option = (event.target as HTMLElement | null)?.closest('[data-index]');
      if (!option) return;
      // A multi-select stays open: the pick is a tick, not the end of the
      // gesture, and closing on the first one would make the second choice cost
      // another double-click.
      this.choose(Number(option.getAttribute('data-index')), !this.isMultiple());
    });

    // Passive: the handler only reads the scroll position and writes styles, so
    // it must never be allowed to block the scroll it is responding to.
    this.on(listbox, 'scroll', () => this.onListScroll(), { passive: true });

    return listbox;
  }

  /**
   * Builds the check-all row shown under the search box in multi-select mode.
   *
   * ### It acts on what is *shown*, not on everything
   * Ticking it selects the options the search has narrowed the list down to.
   * That is what makes it useful — "search `2024`, take all of them" — and it is
   * the only reading under which the control can honestly show its own state:
   * with a remote list, "everything" is a set the browser has never seen.
   *
   * ### Why the press is swallowed
   * `mousedown` is prevented so the click cannot pull focus out of the search
   * field. The user is mid-search; losing the caret to a checkbox means the next
   * character they type goes nowhere. Keyboard users still reach it by `Tab`,
   * where moving focus is exactly what was asked for.
   */
  private buildSelectAll(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'pg-editor-selectall';

    const box = document.createElement('input');
    box.type = 'checkbox';
    // The grid's own checkbox class as well as this one: the row checkboxes and
    // this one are the same control to the user, and sharing the class means
    // every theme variant skins them together — including the indeterminate
    // state, which only the variant stylesheets draw. Safe here despite that
    // class carrying row-selection meaning to `BodyRenderer`'s delegated
    // handler: a popup editor lives in the portal host, outside the rows that
    // handler listens on.
    box.className = 'pg-checkbox pg-editor-selectall__box';
    box.setAttribute('aria-label', this.editorParams().selectAllText ?? DEFAULT_SELECT_ALL_TEXT);

    const text = document.createElement('span');
    text.className = 'pg-editor-selectall__label';
    text.textContent = this.editorParams().selectAllText ?? DEFAULT_SELECT_ALL_TEXT;

    row.appendChild(box);
    row.appendChild(text);

    // Kept out of the input's own activation path. A `<label>` re-dispatches the
    // click onto the checkbox it wraps, so the browser toggled the box *as well
    // as* this handler: one press selected everything and then immediately
    // cleared it again. A plain row, with the default cancelled, leaves exactly
    // one thing deciding the new state.
    this.on(row, 'mousedown', (event) => event.preventDefault());
    this.on(row, 'click', (event) => {
      event.preventDefault();
      if (box.disabled) return;
      // Derived from the editor's own selection, never from `box.checked`: the
      // prevented default means the box has not moved, so reading it would be
      // reading the state this is about to set.
      this.toggleAll(!this.allShownSelected());
    });

    this.selectAll = box;
    return row;
  }

  /** `true` when every option currently shown is already ticked. */
  private allShownSelected(): boolean {
    return (
      this.matches.length > 0 &&
      this.matches.every((option) => this.selected.has(String(option.value)))
    );
  }

  /**
   * Builds the live region that speaks the result count.
   *
   * `polite` rather than `assertive`: the count is context, and interrupting the
   * character the user just typed to deliver it is worse than saying nothing.
   * `aria-atomic` makes the whole sentence re-read, since a diff of "3" against
   * "2" would otherwise be announced as a bare number. It is hidden by
   * `pg-editor-sr-only`, never by `hidden` or `display: none`, which would remove
   * it from the accessibility tree and silence it entirely.
   */
  private buildStatus(): HTMLElement {
    const status = document.createElement('div');
    status.className = 'pg-editor-sr-only';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

    return status;
  }

  /**
   * Publishes the result count, skipping a repeat of what is already there.
   *
   * The guard is not a micro-optimisation: rewriting a live region with the same
   * text makes some screen readers announce it again, so a keystroke that does
   * not change the count would say "3 results available" twice.
   */
  private announce(text: string): void {
    if (this.status.textContent === text) return;
    this.status.textContent = text;
  }

  /**
   * The text the field opens with: the character that started a `'type'`
   * session, and otherwise **nothing**.
   *
   * Deliberately not the cell's current label — see the class note on why
   * seeding the search box made the editor harder to use than an empty one. The
   * current value is preserved by {@link selectedValue} and surfaced by
   * {@link currentLabel} as the placeholder, so nothing is hidden by leaving the
   * box empty.
   */
  private initialText(): string {
    if (this.params.trigger === 'type' && this.params.eventKey !== null) {
      return this.params.eventKey;
    }

    return '';
  }

  /** Resolves the local list — params, then `dropdownOptions`, then `enumOptions`. */
  private resolveOptions(): readonly ColumnDropdownOption[] {
    const declared = this.editorParams().options;
    if (typeof declared === 'function') return declared(this.params);
    if (declared) return declared;

    const { dropdownOptions, enumOptions } = this.params.colDef;
    if (dropdownOptions && dropdownOptions.length > 0) return dropdownOptions;
    if (enumOptions) return enumOptions.map((value) => ({ value, label: value }));

    return [];
  }

  // ─── Input handling ─────────────────────────────────────────────────────────

  /**
   * Reports the keystroke to the grid, then updates the list.
   *
   * Also the only place {@link textEdited} is set: this event fires for typing,
   * pasting and cutting, and for nothing the editor itself does to the field —
   * which is exactly the definition the flag needs.
   */
  private onInput(): void {
    this.textEdited = true;
    this.emit(this.getValue());
    this.refreshMatches(this.input.value);
  }

  /**
   * Recomputes what the list shows for `query`.
   *
   * Which of the two paths it takes is {@link AutocompleteEditorParams.searchMode}'s
   * decision, not the presence of a fetcher: a client-mode column with a fetcher
   * pulls its list **once**, when the editor opens, and filters it in the browser
   * from then on. Routing every keystroke to the server in that case is what put
   * a spinner over an option the user could already see.
   */
  private refreshMatches(query: string): void {
    const { minChars = 0 } = this.editorParams();

    if (query.trim().length < minChars) {
      this.closeList();
      return;
    }

    if (this.serverSearch()) {
      this.scheduleFetch(query);
      return;
    }

    // Client mode with a fetcher: one trip for the list, then never again.
    if (this.editorParams().fetchOptions && !this.fetchedOnce) {
      this.scheduleFetch(query);
      return;
    }

    this.showMatches(this.filter(query));
  }

  /** Whether each keystroke goes to the server. @see AutocompleteEditorParams.searchMode */
  private serverSearch(): boolean {
    const mode = this.editorParams().searchMode ?? 'auto';
    if (mode === 'client') return false;
    if (mode === 'server') return true;
    return this.editorParams().fetchOptions !== undefined;
  }

  /** Restarts the debounce window; only the last keystroke of a burst fetches. */
  private scheduleFetch(query: string): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);

    // Shown now rather than when the request is sent: from the user's side the
    // debounce window is part of the same wait, and a list that reads "No
    // matches" for 200ms before the spinner appears looks like an answer.
    this.showLoading();

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runFetch(query);
    }, this.editorParams().debounceMs ?? 200);
  }

  /**
   * Runs one remote lookup and renders it only if it is still the newest — see
   * the class note on race guarding.
   */
  private async runFetch(query: string): Promise<void> {
    const { fetchOptions } = this.editorParams();
    if (!fetchOptions) return;

    const token = ++this.fetchToken;
    // The query this list belongs to, so a page appended later asks the server
    // for more of the *same* search rather than of whatever is in the box by
    // the time the user scrolls.
    const server = this.serverSearch();

    try {
      const results = await fetchOptions(query);
      if (token !== this.fetchToken || this.disposed) return;

      this.fetchedOnce = true;
      this.pagedQuery = query;
      this.exhausted = false;
      this.options = results;
      // In client mode the fetch was for the whole list, so the query the user
      // has already typed still has to be applied to it.
      this.showMatches(server ? this.capped(results) : this.filter(query));
    } catch {
      // A failed lookup shows an empty list rather than an error: the user must
      // still be able to type, correct the query, or leave the cell.
      if (token === this.fetchToken && !this.disposed) {
        // Not marked as fetched: a client-mode list that failed should try
        // again on the next keystroke rather than filtering an empty list
        // forever.
        this.showMatches([]);
      }

    }
  }

  /**
   * Puts the list into its waiting state: open, showing a spinner, and holding
   * whatever it showed before out of the way.
   *
   * The list is *opened* here, which is the point of the whole thing — a
   * dropdown whose first paint is 1.5 seconds of nothing gives the user no sign
   * their double-click registered, and the second double-click they try lands on
   * an editor that is already open.
   *
   * The previous matches are dropped so the arrow keys cannot walk a list that
   * is about to be replaced, and the check-all is disabled because there is
   * nothing on screen for it to act on.
   */
  private showLoading(): void {
    this.loading = true;
    this.matches = [];
    this.activeIndex = -1;
    this.input.removeAttribute('aria-activedescendant');
    this.listbox.setAttribute('aria-busy', 'true');
    this.listbox.textContent = '';

    const row = document.createElement('li');
    row.className = 'pg-editor-option pg-editor-option--loading';
    // Not selectable, so not an option: announcing it as one would put a row
    // nobody can choose into the listbox's count.
    row.setAttribute('role', 'presentation');

    const spinner = document.createElement('span');
    spinner.className = 'pg-editor-spinner';
    spinner.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = this.editorParams().loadingText ?? DEFAULT_LOADING_TEXT;

    row.appendChild(spinner);
    row.appendChild(label);
    this.listbox.appendChild(row);

    this.syncSelectAll();
    this.announce(this.editorParams().loadingText ?? DEFAULT_LOADING_TEXT);
    this.setOpen(true);
  }

  /** Local substring filter over label and value. */
  private filter(query: string): readonly ColumnDropdownOption[] {
    const { caseSensitive } = this.editorParams();
    const needle = caseSensitive === true ? query.trim() : query.trim().toLowerCase();
    if (needle === '') return this.capped(this.options);

    const limit = this.resultLimit();
    const matched: ColumnDropdownOption[] = [];

    for (const option of this.options) {
      const haystack = `${option.label} ${option.value}`;
      const subject = caseSensitive === true ? haystack : haystack.toLowerCase();
      if (subject.includes(needle)) {
        matched.push(option);
        if (matched.length >= limit) break;
      }
    }
    return matched;
  }

  /** Trims a list to {@link AutocompleteEditorParams.maxResults}. */
  private capped(options: readonly ColumnDropdownOption[]): readonly ColumnDropdownOption[] {
    const limit = this.resultLimit();
    return options.length > limit ? options.slice(0, limit) : options;
  }

  /**
   * How many matches the list will hold.
   *
   * The cap exists because building ten thousand rows on every keystroke is
   * what makes a dropdown feel broken — but that is a cost virtualisation
   * removes, so a virtualised list keeps every match instead of hiding the
   * ones past an arbitrary line. An explicit `maxResults` is always obeyed:
   * asking for a cap and being given an unbounded list would be the surprising
   * reading.
   */
  private resultLimit(): number {
    const declared = this.editorParams().maxResults;
    if (declared !== undefined) return declared;
    return this.editorParams().virtualScroll === true ||
      this.editorParams().loadMore !== undefined ||
      this.options.length > (this.editorParams().virtualScrollThreshold ?? DEFAULT_VIRTUAL_THRESHOLD)
      ? Number.POSITIVE_INFINITY
      : 50;
  }

  /**
   * The option `text` names exactly, by label or by value.
   *
   * Searched over the *full* option list rather than the visible matches: the
   * user may have picked an option and then closed the list, and the committed
   * value must still resolve.
   */
  private findExactOption(text: string): ColumnDropdownOption | undefined {
    const sensitive = this.editorParams().caseSensitive === true;
    const needle = sensitive ? text : text.toLowerCase();

    return this.options.find((option) => {
      const label = sensitive ? option.label : option.label.toLowerCase();
      if (label === needle) return true;

      const value = String(option.value);
      return (sensitive ? value : value.toLowerCase()) === needle;
    });
  }

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  /**
   * The combobox key map.
   *
   * Only keys the open list actually consumes are stopped; everything else keeps
   * its grid-wide meaning, which is what lets `Enter` commit and `Tab` navigate
   * from a closed combobox exactly as they do from a text editor.
   */
  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        if (!this.open) this.refreshMatches(this.input.value);
        this.moveActive(1);
        return;

      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        if (!this.open) this.refreshMatches(this.input.value);
        this.moveActive(-1);
        return;

      case 'Enter':
        this.onEnter(event);
        return;

      case 'Escape':
        // First press dismisses the list; a second reaches the grid and cancels
        // the session — see the class note.
        if (this.open) {
          event.preventDefault();
          event.stopPropagation();
          this.closeList();
        }
        return;

      case 'Tab':
        // Take the highlighted option with us, but let the grid move on: the
        // keystroke's purpose is navigation, not selection.
        if (this.open && this.activeIndex >= 0) this.choose(this.activeIndex);
        return;

      default:
    }
  }

  /**
   * `Enter`: selects and commits in one press, or steps aside.
   *
   * ### Why it commits rather than only selecting
   * Selecting alone left the editor open on a list the user had just finished
   * with, so committing took a second `Enter` — the same "two Enters" complaint
   * the native pickers produced. One keystroke picking *and* closing is what a
   * spreadsheet does, and it is why the event must be stopped here: left to
   * bubble, the grid's own `Enter` binding would commit a second time.
   *
   * ### The three cases
   * An option is highlighted — take it and close. `freeSolo` is on and the text
   * names no option — take the text and close, because there is nothing in the
   * list to wait for. Anything else — do nothing, so `Enter` keeps its grid-wide
   * meaning and the grid commits (or, for text matching no option with
   * `freeSolo` off, {@link validate} blocks it and says why).
   */
  private onEnter(event: KeyboardEvent): void {
    if (this.open && this.activeIndex >= 0) {
      event.preventDefault();
      event.stopPropagation();
      // In multi-select `Enter` ticks the active option and the list stays up,
      // so the next `Enter` on the next option ticks that one too. Committing
      // here would end the session on the first choice, which is the one thing a
      // multi-select must not do. Closing the list (Escape) and pressing Enter
      // with nothing active is the keyboard path out.
      this.choose(this.activeIndex, !this.isMultiple());
      return;
    }

    const text = this.input.value.trim();
    if (
      this.editorParams().freeSolo === true &&
      text !== '' &&
      this.findExactOption(text) === undefined
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.closeList();
      this.requestCommit();
    }
  }

  /** Moves the active option by `delta`, wrapping at both ends. */
  private moveActive(delta: number): void {
    const count = this.matches.length;
    if (count === 0) return;

    const next = this.activeIndex < 0 && delta < 0 ? count - 1 : (this.activeIndex + delta + count) % count;
    this.setActive(next);
  }

  /**
   * Commits a choice to the field and, when `commit` is set, closes the session
   * with it.
   *
   * {@link selectedValue} moves with it, so a later empty field still commits
   * what the user picked rather than reverting to what the cell held on open,
   * and the list marks the right option as selected if it is reopened.
   *
   * @param index - Index into {@link matches}.
   * @param commit - Whether choosing also ends the edit. `true` for the two
   *   gestures that *are* the choice — clicking an option, `Enter` on the
   *   highlighted one. `false` for `Tab`, which takes the highlighted option
   *   with it but belongs to the grid's navigation, not to this editor.
   */
  private choose(index: number, commit = false): void {
    const option = this.matches[index];
    if (!option) return;

    if (this.isMultiple()) {
      this.toggleSelected(option);
      return;
    }

    this.input.value = option.label;
    this.selectedValue = option.value;
    this.closeList();
    this.emit(this.getValue());

    // After `requestCommit` the session tears down, the editor is destroyed and
    // focus returns to the cell — so nothing may touch this instance's DOM
    // below this line.
    if (commit) this.requestCommit();
  }

  /**
   * Adds or removes one option from the multi-select, in place.
   *
   * The row is re-marked rather than the list rebuilt: rebuilding would reset
   * the scroll position and the active option, so ticking the fifth of twenty
   * would throw the user back to the top of a list they are working down.
   */
  private toggleSelected(option: ColumnDropdownOption): void {
    const key = String(option.value);
    if (this.selected.has(key)) this.selected.delete(key);
    else this.selected.set(key, option.value);

    // Matched by reading the attribute rather than by a `[data-value="…"]`
    // selector: option values are arbitrary strings, and one containing a quote
    // or a bracket would make that selector a syntax error at runtime.
    const ticked = this.selected.has(key);
    for (const item of this.listbox.querySelectorAll<HTMLElement>('[data-value]')) {
      if (item.getAttribute('data-value') !== key) continue;
      item.setAttribute('aria-selected', String(ticked));
    }

    this.syncSelectAll();
    this.emit(this.getValue());
  }

  /**
   * Ticks or unticks every option currently shown.
   *
   * Scoped to {@link matches} — see {@link buildSelectAll} for why "all" means
   * "all of these". Untouched options outside the current filter keep whatever
   * state they had, so narrowing the search cannot silently discard a choice
   * made before it.
   */
  private toggleAll(select: boolean): void {
    for (const option of this.matches) {
      const key = String(option.value);
      if (select) this.selected.set(key, option.value);
      else this.selected.delete(key);
    }

    for (const item of this.listbox.querySelectorAll<HTMLElement>('[data-value]')) {
      item.setAttribute('aria-selected', String(select));
    }

    this.syncSelectAll();
    this.emit(this.getValue());
  }

  /**
   * Re-derives the check-all row from the options on screen.
   *
   * Three states, not two: `indeterminate` is what distinguishes "some of these
   * are ticked" from "none are", and a checkbox that showed only the two would
   * claim an empty selection every time one option was unticked. Disabled while
   * there is nothing shown — during a fetch, or on an empty result — because
   * "select all of nothing" is not an action.
   */
  private syncSelectAll(): void {
    const box = this.selectAll;
    if (!box) return;

    const shown = this.matches.length;
    const ticked = this.matches.reduce(
      (count, option) => count + (this.selected.has(String(option.value)) ? 1 : 0),
      0,
    );

    box.disabled = shown === 0;
    box.checked = shown > 0 && ticked === shown;
    box.indeterminate = ticked > 0 && ticked < shown;
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  /**
   * Renders `matches` and opens the list.
   *
   * Two strategies, chosen by size. A short list is built whole — simplest, and
   * the DOM is touched once through a fragment. A long one is *virtualised*: a
   * spacer holds the full scroll height and only the rows in view exist, so the
   * live node count is bounded by the popup's height rather than by the option
   * count, and a hundred thousand options open as fast as ten.
   *
   * Neither path diffs. The set changes wholesale on every keystroke, so a diff
   * would cost more than it saved.
   */
  private showMatches(matches: readonly ColumnDropdownOption[]): void {
    this.matches = matches;
    this.activeIndex = -1;
    this.loading = false;
    this.listbox.removeAttribute('aria-busy');
    // Every option id is about to be reused for a different option, so an
    // `aria-activedescendant` left over from the previous list would describe
    // an element that no longer exists — or, worse, the wrong one.
    this.input.removeAttribute('aria-activedescendant');
    this.resetList();

    if (matches.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'pg-editor-option pg-editor-option--empty';
      // Not an option — it cannot be chosen, and announcing it as one would put
      // an unselectable entry into the listbox's count.
      empty.setAttribute('role', 'presentation');
      empty.textContent = this.editorParams().emptyText ?? 'No matches';
      this.listbox.appendChild(empty);
    } else if (this.virtualised(matches.length)) {
      this.renderVirtual();
    } else {
      const fragment = document.createDocumentFragment();
      matches.forEach((option, index) => fragment.appendChild(this.buildOption(option, index)));
      this.listbox.appendChild(fragment);
    }

    this.syncSelectAll();
    this.announce(describeResults(matches.length));
    this.setOpen(true);
  }

  /** Whether a list of `count` options should be windowed rather than built whole. */
  private virtualised(count: number): boolean {
    const { virtualScroll, virtualScrollThreshold = DEFAULT_VIRTUAL_THRESHOLD } =
      this.editorParams();
    if (virtualScroll !== undefined) return virtualScroll;
    return count > virtualScrollThreshold;
  }

  /** Row height in px, as both the stylesheet and the window maths must see it. */
  private rowHeight(): number {
    const declared = this.editorParams().rowHeight;
    return declared !== undefined && declared > 0 ? declared : DEFAULT_ROW_HEIGHT;
  }

  /** Empties the list and forgets any virtual scaffolding it was using. */
  private resetList(): void {
    this.listbox.textContent = '';
    this.virtualSpacer = null;
    this.virtualWindow = null;
    this.windowStart = -1;
    this.listbox.scrollTop = 0;
  }

  /**
   * Builds one option row.
   *
   * `aria-setsize` and `aria-posinset` are stated explicitly because the virtual
   * path has only a handful of rows in the DOM at a time — without them a screen
   * reader announces "option 3 of 12" over a list of twelve thousand.
   */
  private buildOption(option: ColumnDropdownOption, index: number): HTMLElement {
    const multiple = this.isMultiple();
    const key = String(option.value);
    // Against the *selection*, not the field's text: the field holds a search
    // query that starts empty, so comparing labels to it would leave the list
    // showing nothing as selected and a screen-reader user with no way to tell
    // which option the cell currently holds. Stringified because a column may
    // store `1` where its option declares `'1'`, and an unselected list is a
    // worse outcome than a lenient comparison.
    const selected = this.selectedValue === null ? null : String(this.selectedValue);

    const item = document.createElement('li');
    item.className = multiple
      ? 'pg-editor-option pg-editor-option--checkable'
      : 'pg-editor-option';
    item.id = `${this.listId}-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute(
      'aria-selected',
      String(multiple ? this.selected.has(key) : key === selected),
    );
    item.setAttribute('data-index', String(index));
    // Keyed by value as well as by position, so a tick can be re-marked in place
    // without knowing where the option currently sits in the list.
    item.setAttribute('data-value', key);
    item.setAttribute('aria-setsize', String(this.matches.length));
    item.setAttribute('aria-posinset', String(index + 1));
    if (index === this.activeIndex) item.classList.add('pg-editor-option--active');

    if (multiple) {
      // A styled box driven by `aria-selected`, not an `<input>`: a focusable
      // control inside a `role="option"` is invalid ARIA, and it would put a
      // second tab stop between the user and every option.
      const tick = document.createElement('span');
      tick.className = 'pg-editor-option__check';
      tick.setAttribute('aria-hidden', 'true');
      item.appendChild(tick);

      const label = document.createElement('span');
      label.className = 'pg-editor-option__label';
      label.textContent = option.label;
      item.appendChild(label);
    } else {
      item.textContent = option.label;
    }

    return item;
  }

  /**
   * Puts the list into its windowed form: a full-height spacer, and a positioned
   * viewport holding only the rows that can be seen.
   *
   * The scaffolding carries `role="presentation"` so the two extra elements do
   * not appear between the listbox and its options in the accessibility tree —
   * a `role="listbox"` whose children are anonymous `<div>`s exposes no options
   * at all.
   */
  private renderVirtual(): void {
    const spacer = document.createElement('li');
    spacer.className = 'pg-editor-listbox__spacer';
    spacer.setAttribute('role', 'presentation');
    spacer.style.height = `${this.matches.length * this.rowHeight()}px`;

    const windowEl = document.createElement('ul');
    windowEl.className = 'pg-editor-listbox__window';
    windowEl.setAttribute('role', 'presentation');

    spacer.appendChild(windowEl);
    this.listbox.appendChild(spacer);

    this.virtualSpacer = spacer;
    this.virtualWindow = windowEl;
    this.renderWindow();
  }

  /**
   * Renders the slice of options the current scroll position exposes.
   *
   * Skipped when the window has not moved, which is what keeps a smooth scroll
   * from rebuilding the same rows on every frame the browser fires.
   */
  private renderWindow(): void {
    const windowEl = this.virtualWindow;
    if (!windowEl) return;

    const rowHeight = this.rowHeight();
    const viewport = this.listbox.clientHeight || rowHeight * 8;
    const first = Math.max(0, Math.floor(this.listbox.scrollTop / rowHeight) - VIRTUAL_OVERSCAN);
    const visible = Math.ceil(viewport / rowHeight) + VIRTUAL_OVERSCAN * 2;
    const last = Math.min(this.matches.length, first + visible);

    if (first === this.windowStart && windowEl.childElementCount === last - first) return;
    this.windowStart = first;

    const fragment = document.createDocumentFragment();
    for (let index = first; index < last; index++) {
      fragment.appendChild(this.buildOption(this.matches[index], index));
    }

    windowEl.textContent = '';
    windowEl.appendChild(fragment);
    // Offset rather than positioned per row: one transform moves the whole
    // window, so scrolling costs one style write instead of one per row.
    windowEl.style.transform = `translateY(${first * rowHeight}px)`;
  }

  /**
   * Handles a scroll of the option list: re-window, and ask for the next page
   * when the end comes into view.
   */
  private onListScroll(): void {
    this.renderWindow();
    void this.maybeLoadMore();
  }

  /**
   * Requests the next page once the list is scrolled near its end.
   *
   * Guarded three ways, because a scroll handler fires far faster than a network
   * round trip: nothing while a page is already in flight, nothing once the
   * source has run dry, and nothing while the initial lookup is still going.
   */
  private async maybeLoadMore(): Promise<void> {
    const { loadMore, pageSize = DEFAULT_PAGE_SIZE } = this.editorParams();
    if (!loadMore || this.loadingMore || this.exhausted || this.loading || this.disposed) return;

    const rowHeight = this.rowHeight();
    const remaining =
      this.listbox.scrollHeight - this.listbox.scrollTop - this.listbox.clientHeight;
    if (remaining > rowHeight * LOAD_MORE_ROWS) return;

    this.loadingMore = true;
    const token = this.fetchToken;

    try {
      const page = await loadMore({
        query: this.pagedQuery,
        offset: this.options.length,
        pageSize,
      });
      // A newer search replaced the list while this page was in flight; it
      // belongs to a query the user has already moved on from.
      if (this.disposed || token !== this.fetchToken) return;

      if (page.length === 0) {
        this.exhausted = true;
        return;
      }
      // A short page is the last page: one fewer round trip than asking again
      // only to be told there is nothing left.
      if (page.length < pageSize) this.exhausted = true;

      this.options = [...this.options, ...page];
      this.showMatches(this.serverSearch() ? this.options : this.filter(this.input.value));
    } catch {
      // Stop asking. A source that failed once will fail again on the next
      // scroll tick, and a dropdown that fires a request per frame is worse
      // than one that quietly stops growing.
      this.exhausted = true;
    } finally {
      this.loadingMore = false;
    }
  }

  /**
   * Highlights one option and points `aria-activedescendant` at it.
   *
   * In the virtual path the row may not exist yet, so the list is scrolled to it
   * and the window re-rendered first — arrowing past the bottom of a windowed
   * list would otherwise highlight nothing.
   */
  private setActive(index: number): void {
    const previous = this.listbox.querySelector('.pg-editor-option--active');
    previous?.classList.remove('pg-editor-option--active');

    this.activeIndex = index;

    if (this.virtualWindow) {
      this.scrollIndexIntoView(index);
      this.renderWindow();
    }

    const item = this.findRow(index);
    if (!item) {
      this.input.removeAttribute('aria-activedescendant');
      return;
    }

    item.classList.add('pg-editor-option--active');
    this.input.setAttribute('aria-activedescendant', item.id);
    // Absent in non-browser environments, and never essential — the highlight is
    // already correct, it may simply be out of view.
    if (!this.virtualWindow) item.scrollIntoView?.({ block: 'nearest' });
  }

  /** The rendered row for an option index, if it is currently in the DOM. */
  private findRow(index: number): HTMLElement | null {
    for (const item of this.listbox.querySelectorAll<HTMLElement>('[data-index]')) {
      if (item.getAttribute('data-index') === String(index)) return item;
    }
    return null;
  }

  /** Scrolls a windowed list so `index` sits inside the viewport. */
  private scrollIndexIntoView(index: number): void {
    const rowHeight = this.rowHeight();
    const viewport = this.listbox.clientHeight || rowHeight * 8;
    const top = index * rowHeight;

    if (top < this.listbox.scrollTop) this.listbox.scrollTop = top;
    else if (top + rowHeight > this.listbox.scrollTop + viewport) {
      this.listbox.scrollTop = top + rowHeight - viewport;
    }
  }

  /** Hides the list and clears the active option. */
  private closeList(): void {
    this.activeIndex = -1;
    this.matches = [];
    this.loading = false;
    this.listbox.removeAttribute('aria-busy');
    this.input.removeAttribute('aria-activedescendant');
    this.syncSelectAll();
    // Emptied rather than left saying "3 results available" about a list that is
    // no longer on screen. Silent, because closing the list is an action the
    // user just took and does not need narrated back.
    this.announce('');
    this.setOpen(false);
  }

  /** Single point of truth for the open state, the attribute and the DOM. */
  private setOpen(open: boolean): void {
    this.open = open;
    this.listbox.hidden = !open;
    this.input.setAttribute('aria-expanded', String(open));
  }
}
