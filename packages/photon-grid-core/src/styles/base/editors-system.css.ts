/**
 * Photon Grid base styles — editing system.
 *
 * Chrome owned by the `src/editing` pipeline rather than by any individual
 * editor: how an open editor sits inside its cell, the focus and rejection
 * affordances, the popup shell, the native-picker treatment, and the
 * assistive-technology-only surfaces.
 *
 * Concatenated immediately after `editorsCss` (see `base-styles.ts`), which
 * holds the older `.pg-editor*` rules a theme may already target. Being later
 * in the same stylesheet is what lets these refine those rules without raising
 * specificity — the ordering is load-bearing, so keep it.
 *
 * Every value resolves a theme token; the literals after each `var()` are
 * fallbacks so an unstyled or server-rendered grid is still legible.
 */
export const editorsSystemCss = `/* ════════════════════════════════════════════
   Editing system (src/editing)
   ════════════════════════════════════════════════════════════════════════════ */

/* ── The editing cell ──────────────────────────────────────────────────────
   The ring is drawn on the CELL, as an 'outline', not on the control and not
   as a pseudo-element.

   Drawing it on the input meant it traced the input's box, which is inset from
   the cell by the cell's own padding and sits above the row's bottom border —
   so the ring visibly clipped at the edges and left slivers of white between
   itself and the cell boundary.

   ### Why not ::after, which is how the selection edges do it
   Because ::after on a cell already belongs to the selection system, and that
   system *removes* it: an edited cell is always the active cell, and
   cells.css.ts carries

     .pg-cell--active-cell:not(.pg-cell--in-selection)::after { content: none }
     .pg-cell--single-cell-selection.pg-cell--in-selection
       .pg-cell--active-cell::after                          { content: none }

   at two and three classes respectively. A '.pg-cell--editing::after' rule is
   one class, so 'content: none' won and the ring simply never existed — no
   pseudo-element was generated at all. Chaining enough selection classes onto
   the editing rule to outrank those would work, but it would also have to be
   redone, one class longer, for the rejection flash that recolours the same
   ring — a specificity ladder that grows every time the selection CSS changes.

   'outline' sidesteps it entirely: a separate property nothing in the selection
   system touches, drawn outside the border box so it cannot be clipped by the
   cell's own overflow, and — unlike box-shadow, which the selection rules *do*
   claim and which this file already has to neutralise with !important — free of
   any existing contention. It also follows 'border-radius', which is what makes
   the corner treatment possible at all. */

.pg-cell--editing {
  position: relative;
  padding: 0;
  /* Above neighbouring cells so the ring is never overpainted by the next
     cell's background or border. */
  z-index: 2;
  border-radius: var(--pg-cell-editing-radius, 4px);
  outline: var(--pg-cell-editing-outline-width, 2px) solid
           var(--pg-cell-editing-outline-color, var(--pg-colors-primary, #2563eb));
  /* Negative, so the ring is drawn *inside* the cell's own box. A zero or
     positive offset puts it in the neighbouring column's territory, where that
     cell's background paints straight over it. */
  outline-offset: calc(var(--pg-cell-editing-outline-width, 2px) * -1);
}

.pg-cell--editing .pg-cell__inner {
  /* No inline padding while editing: the control spans the cell edge to edge,
     so the ring on the cell is the only thing framing it. A small block inset
     keeps the field off the row's top and bottom borders. */
  padding-inline: 0;
  padding-block: 2px;
  /* An inline editor may legitimately paint outside its box (a native picker
     indicator, a focus glow); the cell clips nothing while editing. */
  overflow: visible;
}

/* ── The fill handle stands down while editing ─────────────────────────────
   The handle sits in the bottom-right corner of the selection's last cell —
   which, for the single-cell selection a double-click produces, is the cell now
   being edited. Left there it overlaps the editing ring at exactly the corner
   the ring turns, reads as a stray artefact on top of a live control, and gives
   the cell two conflicting drag affordances at once.

   Hidden rather than removed: display:none takes it out of hit-testing too, so
   a stray press on the corner cannot start a fill drag out of an open editor,
   and the handle returns by itself the moment the session ends — no teardown
   step that a cancelled or crashed edit could skip. */

.pg-cell--editing .pg-fill-handle { display: none; }

/* ── The control inside an editing cell ────────────────────────────────────
   Transparent, so the cell's own editing surface (above) is what shows.

   Two backgrounds stacked here — the cell's and the control's — differed by a
   hair in several themes and produced a visible inner rectangle. One surface,
   owned by the cell, keeps the field looking like a single solid control.

   No inline padding: the cell's inner already zeroes it, and an editor adding
   its own would reintroduce exactly the inset that was asked to go. */

.pg-cell--editing .pg-editor {
  width: 100%;
  height: 100%;
  /* The inner is a flex row, so a bare width:100% is still subject to the
     item's own shrink and to min-width:auto — a <select> whose longest option
     is wider than the column would otherwise refuse to shrink to it, and a
     short control would sit narrower than the cell. Growing and shrinking from
     a 100% basis, with the automatic minimum removed, pins the control to the
     cell at every column width. */
  flex: 1 1 100%;
  min-width: 0;
  padding-inline: 0;
  padding-block: 0;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  box-sizing: border-box;
  /* The ring lives on the cell now; a second one here would double-draw. */
  box-shadow: none;
}

.pg-cell--editing .pg-editor:focus,
.pg-cell--editing .pg-editor:focus-visible {
  outline: none;
  box-shadow: none;
}

/* ── The editing cell's surface ────────────────────────────────────────────
   An editing cell gets its own solid background rather than inheriting the
   row's.

   That is the opposite of what the rest of the cell does, and deliberate: while
   editing, the cell is a control, and a control needs a stable, opaque,
   maximal-contrast surface to type into. Inheriting a hover tint, a zebra
   stripe or a selection wash under live text made the field read as "part of
   the row" instead of "the thing you are typing in", and the tint shifted the
   moment the pointer moved.

   ### Why the long selectors and the !important
   An edited cell is also the focused cell, so it always carries the selection
   classes — and those rules in cells.css.ts are deliberately aggressive:
   .pg-cell--in-selection paints a fill with !important, and
   .pg-cell--single-cell-selection.pg-cell--in-selection.pg-cell--active-cell
   forces background-color: transparent !important at specificity 0,3,0. A
   plain .pg-cell--editing rule (0,1,0, no !important) loses to both, which is
   why the editing cell kept showing the row through it.

   Chaining .pg-cell--editing onto each of those combinations outranks them, and
   !important is required to answer the !important they already use — it is
   matching the existing convention in that file, not papering over specificity.

   ### Why light and dark are separate rules with separate tokens
   A single token gets pinned by an app to one literal — the example app pins
   --pg-colors-cell-edit-background to #ffffff — and that value would then follow
   the grid into dark mode and paint a white cell on a dark row. Giving dark its
   own hook lets an app override either mode without breaking the other, while
   overriding neither still yields white on light and dark on dark. */

.pg-cell--editing,
.pg-cell--editing.pg-cell--in-selection,
.pg-cell--editing.pg-cell--active-cell,
.pg-cell--editing.pg-cell--in-selection.pg-cell--active-cell,
.pg-cell--editing.pg-cell--single-cell-selection.pg-cell--in-selection.pg-cell--active-cell {
  background-color: var(--pg-colors-cell-edit-background, #fff) !important;
  /* The selection rules also stamp their own inset ring. Two rings — theirs and
     the editing outline — is the doubled/clipped border that made an editing
     cell look broken. The editing ring is the only one that should show. */
  box-shadow: none !important;
}

[data-pg-mode='dark'] .pg-cell--editing,
[data-pg-mode='dark'] .pg-cell--editing.pg-cell--in-selection,
[data-pg-mode='dark'] .pg-cell--editing.pg-cell--active-cell,
[data-pg-mode='dark'] .pg-cell--editing.pg-cell--in-selection.pg-cell--active-cell,
[data-pg-mode='dark'] .pg-cell--editing.pg-cell--single-cell-selection.pg-cell--in-selection.pg-cell--active-cell {
  background-color: var(
    --pg-colors-cell-edit-background-dark,
    var(--pg-colors-surface-raised, var(--pg-colors-surface, #1e293b))
  ) !important;
  box-shadow: none !important;
}

/* The range-outline ::after those selection rules draw would sit under the
   editing ring at a different inset. One frame, not two. */
.pg-cell--editing.pg-cell--in-selection::after { border-width: 0; }

.pg-editor::placeholder { color: var(--pg-colors-text-secondary, #94a3b8); }

/* Applied by EditorHost to whatever getGui() returned, so a custom editor is
   boxed like a built-in without having to know about it. */
.pg-editor-root { box-sizing: border-box; max-width: 100%; }

/* ── Rejected value: one red pulse, then gone ──────────────────────────────
   A rejection is an event, not a state. The cell pulses red so the *location*
   of the problem is unmistakable, and the *reason* travels to a toast, which
   has room for a sentence a column does not. The previous persistent border
   plus inline banner competed with the editor for the same few pixels and left
   the grid looking broken long after the user had understood the problem.

   Animated on 'outline-color', for the same reason the ring itself moved off
   ::after: the pseudo-element an editing cell would have used is deleted by the
   selection rules, so the old flash recoloured a border that was never drawn. */

.pg-cell--editing.pg-cell--invalid-flash {
  animation: pg-editor-invalid-pulse 600ms ease-out 1;
}

/* A cell with no editor open (onInvalid: 'accept') has no ring to recolour, so
   it gets a transparent one for the duration of the pulse. */
.pg-cell--invalid-flash:not(.pg-cell--editing) {
  border-radius: var(--pg-cell-editing-radius, 4px);
  outline: var(--pg-cell-editing-outline-width, 2px) solid transparent;
  outline-offset: calc(var(--pg-cell-editing-outline-width, 2px) * -1);
  animation: pg-editor-invalid-cell-pulse 600ms ease-out 1;
}

@keyframes pg-editor-invalid-pulse {
  0%   { outline-color: var(--pg-colors-danger, #dc2626); }
  70%  { outline-color: var(--pg-colors-danger, #dc2626); }
  /* Settles back to the ring's own colour, not to primary directly — a grid
     that retinted the ring would otherwise watch every rejection fade to a
     colour it had overridden away. */
  100% { outline-color: var(--pg-cell-editing-outline-color, var(--pg-colors-primary, #2563eb)); }
}

@keyframes pg-editor-invalid-cell-pulse {
  0%   { outline-color: var(--pg-colors-danger, #dc2626); }
  70%  { outline-color: var(--pg-colors-danger, #dc2626); }
  100% { outline-color: transparent; }
}

/* ── Native picker inputs (date / datetime / time) ─────────────────────────
   The browser owns the calendar and clock popovers and they cannot be styled;
   what can be styled is the field that summons them, and the indicator that
   invites the click. Giving these a visible affordance is the difference
   between a date cell that looks editable and one that looks like text. */

.pg-editor--picker {
  padding-right: 6px;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.pg-editor--picker::-webkit-calendar-picker-indicator {
  padding: 3px;
  margin-left: 2px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  opacity: 0.55;
  cursor: pointer;
  transition: opacity 120ms ease, background 120ms ease;
}

.pg-editor--picker:hover::-webkit-calendar-picker-indicator,
.pg-editor--picker:focus::-webkit-calendar-picker-indicator {
  opacity: 1;
  background: var(--pg-colors-primary-subtle, #eff6ff);
}

/* Firefox and Safari render no indicator at all; the field still reads as a
   control because of the cell ring and the pointer cursor above. */
.pg-editor--picker::-webkit-datetime-edit { padding: 0; }
.pg-editor--picker::-webkit-datetime-edit-fields-wrapper { padding: 0; }

/* ── Select ────────────────────────────────────────────────────────────────
   Fills the cell exactly, so the closed control and its open list are both as
   wide as the column — and follow it as the column is resized, because the
   width is a percentage of a cell whose width is already driven by the column
   stylesheet. A real chevron, so a select cell is distinguishable from a text
   cell before it is clicked; drawn as a background image because a <select>
   cannot host children. */

.pg-cell--editing .pg-editor--select {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* A <select>'s intrinsic width is that of its longest option, and as a flex
     item it would keep it. Both are re-stated here because this rule is the one
     a theme is most likely to override wholesale. */
  flex: 1 1 100%;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  /* Matches the inline padding a rendered cell uses, so the closed control's
     text sits exactly where the cell's own text was and the value does not
     visibly jump left when the editor opens. */
  padding-left: 12px;
  padding-right: 26px;
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
                    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 14px) calc(50% + 1px), calc(100% - 9px) calc(50% + 1px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  /* An explicit colour, where every other editor is deliberately transparent.
     A <select> is the one control whose *popup* the browser paints for us, and
     Chrome paints that popup with the select's own computed background-color —
     'transparent' resolves to white there, which is why a dark grid dropped a
     white option list on the user. The token is the one the editing cell paints
     itself with, so the closed control still looks like part of the cell. */
  background-color: var(--pg-colors-cell-edit-background, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
}

/* The options themselves. Chrome takes the popup's background from the select,
   but Firefox and Safari paint each row from the option's own colours, so both
   have to be stated or one of the three keeps a white list. */
.pg-cell--editing .pg-editor--select option {
  background-color: var(--pg-colors-cell-edit-background, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
}

[data-pg-mode='dark'] .pg-cell--editing .pg-editor--select,
[data-pg-mode='dark'] .pg-cell--editing .pg-editor--select option {
  background-color: var(
    --pg-colors-cell-edit-background-dark,
    var(--pg-colors-surface-raised, var(--pg-colors-surface, #1e293b))
  );
  color: var(--pg-colors-text-primary, #e2e8f0);
}

/* ── Composite editors (control + readout) ─────────────────────────────────
   Shared by the range and colour editors so neither re-invents the same row.
   Any custom editor pairing a control with a label can reuse it. */

.pg-editor-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  /* Matches the single-control case: no inline padding while editing. */
  padding-inline: 0;
  box-sizing: border-box;
  background: transparent;
}
.pg-editor-group .pg-editor { padding: 0; }
.pg-editor-group__readout {
  flex: 0 0 auto;
  min-width: 4ch;
  text-align: right;
  color: var(--pg-colors-text-secondary, #64748b);
  font-variant-numeric: tabular-nums;
  font-size: var(--pg-typography-font-size-sm, 12px);
}

/* ── Colour ────────────────────────────────────────────────────────────────
   One swatch, sized like a control rather than stretched to fill the cell.
   A full-width colour input reads as a block of paint, not as a picker. */

.pg-editor-group--color { gap: 10px; }

.pg-cell--editing .pg-editor--color {
  flex: 0 0 auto;
  width: 30px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--pg-colors-border, #cbd5e1);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}
/* The native swatch carries its own inset padding in Blink/WebKit, which shows
   as a white frame around the colour. Zeroing it makes the control read as a
   solid chip. */
.pg-editor--color::-webkit-color-swatch-wrapper { padding: 0; }
.pg-editor--color::-webkit-color-swatch { border: none; border-radius: 3px; }
.pg-editor--color::-moz-color-swatch { border: none; border-radius: 3px; }

.pg-editor--color-hex {
  flex: 1;
  min-width: 0;
  font-variant-numeric: tabular-nums;
  text-transform: uppercase;
}

.pg-editor__color-presets { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.pg-editor__color-preset {
  width: 14px;
  height: 14px;
  padding: 0;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 3px;
  cursor: pointer;
}
.pg-editor__color-preset:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}

/* ── Range ─────────────────────────────────────────────────────────────────── */

.pg-cell--editing .pg-editor--range {
  flex: 1;
  min-width: 0;
  height: 4px;
  padding: 0;
  accent-color: var(--pg-colors-primary, #2563eb);
  cursor: pointer;
}

/* ── Switch ────────────────────────────────────────────────────────────────── */

.pg-cell--editing .pg-editor--switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: auto;
  padding-inline: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
.pg-editor__switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 34px;
  height: 18px;
  border-radius: 9px;
  background: var(--pg-colors-border-strong, #cbd5e1);
  transition: background 140ms ease;
}
.pg-editor__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--pg-colors-surface, #fff);
  box-shadow: 0 1px 3px rgba(0,0,0,0.28);
  transition: transform 140ms ease;
}
.pg-editor--switch-on .pg-editor__switch-track { background: var(--pg-colors-primary, #2563eb); }
.pg-editor--switch-on .pg-editor__switch-thumb { transform: translateX(16px); }
.pg-editor--switch:focus-visible .pg-editor__switch-track {
  box-shadow: 0 0 0 2px var(--pg-colors-surface, #fff),
              0 0 0 4px var(--pg-colors-primary, #2563eb);
}

/* ── Checkbox ──────────────────────────────────────────────────────────────── */

.pg-cell--editing .pg-editor--checkbox {
  width: 16px;
  height: 16px;
  margin-inline: 0;
  margin-block: 0;
  padding: 0;
  accent-color: var(--pg-colors-primary, #2563eb);
  cursor: pointer;
}

/* ── Password reveal ───────────────────────────────────────────────────────── */

.pg-editor__reveal {
  flex: 0 0 auto;
  padding: 3px 7px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  cursor: pointer;
}
.pg-editor__reveal:hover,
.pg-editor__reveal[aria-pressed='true'] {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-editor__reveal:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: -1px;
}

/* ── Popup shell ───────────────────────────────────────────────────────────
   Portalled editors — textarea, autocomplete, and any custom editor whose
   isPopup() returns true. position:fixed is what lets it escape the grid's
   overflow clipping; PopupService writes the coordinates. */

.pg-editor-popup {
  position: fixed;
  z-index: 99999;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  /* Hidden until PopupService has measured and placed it; without this the
     popup paints once at the origin and visibly jumps into position. */
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transform-origin: top center;
  transition: opacity 130ms ease, transform 130ms ease;
}
.pg-editor-popup--visible { opacity: 1; transform: translateY(0) scale(1); }
.pg-editor-popup[data-placement='above'] { transform-origin: bottom center; }

/* Inside a popup the control is a normal bordered field again — there is no
   cell ring out here to stand in for one. */
.pg-editor-popup .pg-editor {
  height: auto;
  padding: 7px 9px;
  border: 1px solid var(--pg-colors-border, #cbd5e1);
  border-radius: var(--pg-borders-radius-sm, 6px);
  background: var(--pg-colors-surface-raised, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-editor-popup .pg-editor:focus {
  border-color: var(--pg-colors-primary, #2563eb);
  box-shadow: 0 0 0 3px var(--pg-colors-primary-subtle, rgba(37,99,235,0.16));
}
.pg-editor-popup .pg-editor--textarea {
  min-height: 96px;
  resize: vertical;
  line-height: 1.55;
}

/* ── Autocomplete listbox ──────────────────────────────────────────────────── */

/* The combobox fills the popup, which PopupService has already sized to the
   cell. Without this the root shrink-wraps its widest option and the search
   field above it ends up narrower than the list below — the two halves of one
   control disagreeing about how wide they are. */
.pg-editor-combobox {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}
.pg-editor-popup .pg-editor--autocomplete { width: 100%; box-sizing: border-box; }

.pg-editor-listbox {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
}

/* ── Virtualised list ──────────────────────────────────────────────────────
   The spacer holds the full scroll height of every option; the window holds
   only the rows in view and is moved down by a single transform. Both carry
   role="presentation", so the accessibility tree still sees a listbox whose
   children are options. */

.pg-editor-listbox__spacer { position: relative; }
.pg-editor-listbox__window {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  /* Its own layer, so scrolling repaints the window rather than the popup. */
  will-change: transform;
}
/* A windowed row must be exactly as tall as the maths assumes, or the rows
   drift out of step with the scrollbar. Only applied inside the window, so a
   short list keeps its natural, content-sized rows. */
.pg-editor-listbox__window .pg-editor-option {
  height: var(--pg-ac-row-height, 32px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
}
.pg-editor-option {
  padding: 7px 10px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: inherit;
}
.pg-editor-option:hover,
.pg-editor-option--active { background: var(--pg-colors-row-hover, var(--pg-colors-background-alt, #f1f5f9)); }
.pg-editor-option[aria-selected='true'] {
  /* The same pair a selected row uses: the subtle primary wash behind it, and
     the primary itself for the text — which is also what a link cell resolves
     to, so a chosen option and a link are the same colour in every theme. */
  background: var(--pg-colors-primary-subtle, #eff6ff);
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 500;
}
.pg-editor-option[aria-selected='true']:hover {
  background: var(--pg-colors-primary-subtle-hover, var(--pg-colors-primary-subtle, #eff6ff));
}
.pg-editor-option--empty { color: var(--pg-colors-text-secondary, #64748b); cursor: default; }
.pg-editor-option--empty:hover { background: transparent; }

/* ── Waiting for a remote list ─────────────────────────────────────────────
   A row, not an overlay: the list is already the right shape and the right
   width, and a spinner sitting in it keeps the popup from resizing when the
   results land. It reads as "the list is being filled in" rather than as a
   panel covering something. */

.pg-editor-option--loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: default;
}
.pg-editor-option--loading:hover { background: transparent; }

.pg-editor-spinner {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  /* Three-quarters of a ring in the track colour and a quarter in the accent:
     the gap is what makes the rotation visible without animating anything but
     one transform. */
  border: 2px solid var(--pg-colors-border, #e2e8f0);
  border-top-color: var(--pg-colors-primary, #2563eb);
  animation: pg-editor-spin 700ms linear infinite;
}
@keyframes pg-editor-spin { to { transform: rotate(360deg); } }

/* ── Multi-select ──────────────────────────────────────────────────────────
   The tick is drawn from the option's own aria-selected state, so the visual
   state and the announced state cannot disagree — there is only one source for
   both, and no second element to keep in step. */

.pg-editor-option--checkable {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pg-editor-option__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pg-editor-option__check {
  flex: none;
  position: relative;
  /* The grid's own checkbox tokens, not a second set: a tick in a dropdown and
     a tick in a row are the same control to the user, and two token families
     drift apart the first time a theme retints one of them. Geometry matches
     the variant stylesheets exactly, so the two read as one component. */
  width: var(--pg-sizing-checkbox-size, 16px);
  height: var(--pg-sizing-checkbox-size, 16px);
  box-sizing: border-box;
  border: 1px solid var(--pg-colors-checkbox-border, var(--pg-colors-border, #cbd5e1));
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-checkbox-background, var(--pg-colors-surface, #fff));
  transition:
    background var(--pg-transitions-duration-fast, 120ms) ease,
    border-color var(--pg-transitions-duration-fast, 120ms) ease;
}
.pg-editor-option[aria-selected='true'] .pg-editor-option__check {
  border-color: var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-primary, #2563eb);
}
/* The tick: two borders of a rotated box, at the same offsets the row
   checkboxes use, so it needs no icon asset and lines up with them. */
.pg-editor-option[aria-selected='true'] .pg-editor-option__check::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: 2px solid var(--pg-colors-on-primary, #fff);
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

/* The check-all row, between the search box and the list it acts on. The box
   itself carries the pg-checkbox class, so it *is* the grid's checkbox — every
   theme variant skins it along with the ones in the rows, including the
   indeterminate state. Only layout is set here. */
.pg-editor-selectall {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  cursor: pointer;
  user-select: none;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: inherit;
}
.pg-editor-selectall:hover { color: var(--pg-colors-text-primary, #0f172a); }
.pg-editor-selectall__box { margin: 0; }
.pg-editor-selectall__box:disabled { cursor: default; }
.pg-editor-selectall:has(.pg-editor-selectall__box:disabled) {
  opacity: 0.5;
  cursor: default;
}

/* ── Assistive-technology-only text ────────────────────────────────────────
   Visually hidden but never display:none — content that is not rendered is not
   announced, which would defeat the purpose. Functional geometry, not theming,
   so no tokens here. */

.pg-editor-live-region,
.pg-editor-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* ── Reduced motion ────────────────────────────────────────────────────────
   The rejection pulse and the popup entrance are decorative. The invalid state
   still reaches the user through the toast and through aria-invalid, so
   removing the motion costs no information. */

@media (prefers-reduced-motion: reduce) {
  .pg-editor-popup { transition: none; transform: none; }
  .pg-editor-popup--visible { transform: none; }
  .pg-cell--editing.pg-cell--invalid-flash,
  .pg-cell--invalid-flash:not(.pg-cell--editing) { animation: none; }
  /* No pulse, so the rejection has to be a steady colour instead — otherwise
     the only visual signal disappears along with the motion. */
  .pg-cell--editing.pg-cell--invalid-flash,
  .pg-cell--invalid-flash:not(.pg-cell--editing) {
    outline-color: var(--pg-colors-danger, #dc2626);
  }
  .pg-editor__switch-track,
  .pg-editor__switch-thumb { transition: none; }
}

/* ── Forced colours (Windows high contrast) ────────────────────────────────
   System colours replace every token, so the ring has to be re-stated in terms
   the mode understands or the editing cell loses its outline entirely. */

@media (forced-colors: active) {
  .pg-cell--editing { outline-color: Highlight; }
  .pg-cell--editing.pg-cell--invalid-flash,
  .pg-cell--invalid-flash:not(.pg-cell--editing) { outline-color: LinkText; }
  .pg-editor-popup { border-color: CanvasText; }
}
.pg-cell--editing > .pg-cell__inner:has(> .pg-editor--select) {
  padding-inline: 0 !important;
}
`;
