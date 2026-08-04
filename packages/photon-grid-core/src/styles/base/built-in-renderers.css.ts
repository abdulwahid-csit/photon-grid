/**
 * Styles for the built-in cell renderers.
 *
 * Every value comes from a theme token with a literal fallback, and every
 * value-driven quantity (a progress bar's fill, a tag's colour) arrives as a
 * CSS custom property rather than an inline declaration — that is what keeps
 * these themeable, and it is also what lets the renderers' `patch` hooks update
 * a cell with one property write instead of a rebuild.
 */
export const builtInRenderersCss = `
/* ── Text ─────────────────────────────────────────────────────────────────── */
.pg-cell__value--multiline {
  white-space: pre-line;
  line-height: var(--pg-typography-line-height-tight, 1.3);
}
/* Clamped multiline. The line count is a custom property so the renderer sets
   one value rather than emitting a rule per column. */
.pg-cell__value--clamped,
.pg-long-text__text--clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pg-cell-max-lines, 2);
  line-clamp: var(--pg-cell-max-lines, 2);
  overflow: hidden;
}
.pg-cell__value--json {
  font-family: var(--pg-typography-font-family-mono, ui-monospace, monospace);
  font-size: var(--pg-typography-font-size-xs, 11px);
}

/* ── Long text ────────────────────────────────────────────────────────────── */
/* The root drops the base .pg-cell__value clipping and hands it to the text
   element instead: the toggle is absolutely positioned, and an overflow-hidden
   ancestor would clip it away at the corner it is supposed to sit in. */
.pg-cell__value--long-text {
  overflow: visible;
  min-width: 0;
}
.pg-long-text__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Gutter for the toggle, held open whether or not it is currently visible, so
   the ellipsis lands clear of the icon and nothing reflows on hover. */
.pg-long-text__text--inset {
  padding-inline-end: var(--pg-long-text-toggle-gutter, 22px);
}
/* Clamped variants wrap, so the single-line ellipsis rule has to give way.
   The display value is re-asserted rather than inherited from the shared clamp
   rule in the Text section above: both selectors are one class deep, so the
   base rule between them would win on source order and quietly kill the
   line clamp. */
.pg-long-text__text--clamped {
  display: -webkit-box;
  white-space: normal;
  text-overflow: clip;
  word-break: break-word;
  line-height: var(--pg-typography-line-height-tight, 1.3);
}

/* Anchored to the cell (.pg-cell is the nearest positioned ancestor), not to
   the text, so the control sits in a fixed corner instead of drifting with the
   value's length. Its size and inset are component tokens rather than raw
   pixels — the scale stops at --pg-spacing-xs, and this control needs to sit
   tighter into the corner than 4px allows. */
.pg-long-text__toggle {
  position: absolute;
  inset-block-end: var(--pg-long-text-toggle-inset, 2px);
  inset-inline-end: var(--pg-long-text-toggle-inset, 2px);
  /* Above everything else that can appear inside a cell — the fill handle and
     the selection canvas both sit at 10. A control the user can see but only
     partly press is worse than one that is not offered at all. */
  z-index: var(--pg-long-text-toggle-z, 11);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--pg-long-text-toggle-size, 18px);
  height: var(--pg-long-text-toggle-size, 18px);
  padding: 0;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface-overlay, #fff);
  color: var(--pg-colors-text-secondary, #64748b);
  box-shadow: var(--pg-shadows-xs, 0 1px 2px rgba(15, 23, 42, 0.12));
  cursor: pointer;
  font-family: inherit;
  transition:
    opacity var(--pg-transitions-duration-fast, 120ms) var(--pg-transitions-easing-base, ease),
    background var(--pg-transitions-duration-fast, 120ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 120ms) var(--pg-transitions-easing-base, ease);
}
/* The reveal is opacity only — the control stays hit-testable at all times.
   Gating pointer-events on :hover made the press a race: the browser hit-tests
   pointerdown against whatever style is committed at that instant, so a press
   landing in the same frame the cell first hovers would resolve to the cell
   underneath and the toggle would appear to do nothing. There is no
   invisible-but-clickable state to worry about either — reaching this corner
   with a cursor is what hovers the cell, so by then the control is already
   shown.

   Scoped to devices that can actually hover: on a touch screen there is no
   hover to enter, and a control hidden behind one would be invisible and
   unreachable forever. */
@media (hover: hover) {
  .pg-long-text__toggle--hover { opacity: 0; }
  .pg-cell:hover .pg-long-text__toggle--hover,
  .pg-long-text__toggle--hover:focus-visible,
  .pg-long-text__toggle--hover[aria-expanded='true'] {
    opacity: 1;
  }
}
.pg-long-text__toggle:hover,
.pg-long-text__toggle[aria-expanded='true'] {
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-long-text__toggle:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
/* Press target wider than the paint. The visual is a deliberately unobtrusive
   18px, well under the ~24px a pointer target should offer, so the whole icon
   plus a margin around it answers to a press rather than only the part of the
   glyph the cursor happens to land on. Costs no layout — the pseudo-element is
   positioned, so it never affects the cell's box. */
.pg-long-text__toggle::after {
  content: '';
  position: absolute;
  inset: calc(var(--pg-long-text-toggle-hit-slop, 5px) * -1);
}
/* The fill handle claims the same corner on the active range's last cell.
   Step aside rather than stack — one of the two would be unclickable. */
.pg-cell--has-fill-handle .pg-long-text__toggle {
  inset-inline-end: var(--pg-spacing-md, 12px);
}

/* ── Long text overlay ────────────────────────────────────────────────────── */
/* Fixed, and on document.body, for the same reason as the avatar roster below:
   anchored inside the grid it would be clipped by the scroll container and
   would scroll away from its own trigger. Width joins the coordinates as a
   custom property because it too is resolved per cell at open time. */
.pg-long-text-overlay {
  position: fixed;
  top: var(--pg-overlay-y, 0);
  left: var(--pg-overlay-x, 0);
  z-index: var(--pg-z-overlay, 1200);
  display: none;
  box-sizing: border-box;
  width: var(--pg-overlay-width, 320px);
  max-height: var(--pg-overlay-max-height, 320px);
  overflow-y: auto;
  padding: var(--pg-spacing-sm, 8px) var(--pg-spacing-md, 12px);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 8px);
  background: var(--pg-colors-surface-overlay, #fff);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: var(--pg-typography-font-size-sm, 12px);
}
.pg-long-text-overlay--open { display: block; }
.pg-long-text-overlay:focus { outline: none; }

.pg-long-text-overlay__title {
  margin-block-end: var(--pg-spacing-xs, 4px);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  text-transform: uppercase;
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.04em);
  color: var(--pg-colors-text-secondary, #64748b);
}
/* The heading element is reused across opens, so an untitled panel hides it
   rather than the overlay rebuilding its subtree each time. */
.pg-long-text-overlay__title--hidden { display: none; }

/* pre-wrap keeps the value's own line breaks; overflow-wrap is what stops an
   unbroken 400-character token from widening the panel past its anchor. */
.pg-long-text-overlay__body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: var(--pg-typography-line-height-base, 1.5);
}

/* ── Links ────────────────────────────────────────────────────────────────── */
.pg-cell-link {
  color: var(--pg-colors-primary, #2563eb);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-cell-link:hover { text-decoration: underline; }
.pg-cell-link:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
  border-radius: var(--pg-borders-radius-sm, 4px);
}

/* ── Media ────────────────────────────────────────────────────────────────── */
.pg-cell-image {
  border-radius: var(--pg-borders-radius-sm, 4px);
  display: block;
  flex-shrink: 0;
}
.pg-cell-image--round,
.pg-cell-avatar--round { border-radius: var(--pg-borders-radius-pill, 9999px); }
/* Initials fallback. Its background is set per-value by the renderer, so only
   the text colour is themed here — white reads against every generated hue. */
.pg-cell-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  border-radius: var(--pg-borders-radius-sm, 4px);
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.02em);
}

/* ── Profile ──────────────────────────────────────────────────────────────── */
/* The avatar's diameter is one custom property the renderer may override per
   column, and every other measurement here is derived from it — so a 36px
   avatar retunes the whole cell without a second declaration. */
.pg-cell__value--profile {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}
.pg-profile {
  --pg-profile-avatar-size: 32px;
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm, 8px);
  min-width: 0;
  width: 100%;
}
.pg-profile__avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 auto;
  width: var(--pg-profile-avatar-size, 32px);
  height: var(--pg-profile-avatar-size, 32px);
  overflow: hidden;
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  /* Scaled from the diameter rather than fixed, so initials stay proportionate
     at every configured size. */
  font-size: calc(var(--pg-profile-avatar-size, 32px) * 0.36);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  line-height: 1;
}
.pg-profile__avatar--circle { border-radius: var(--pg-borders-radius-pill, 9999px); }
.pg-profile__avatar--rounded { border-radius: var(--pg-borders-radius-md, 8px); }
.pg-profile__avatar--square { border-radius: 0; }
.pg-profile__avatar--initials {
  background: var(--pg-profile-avatar-color, var(--pg-colors-primary, #2563eb));
  color: #fff;
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.02em);
}
.pg-profile__avatar--icon { color: var(--pg-profile-avatar-color, var(--pg-colors-text-secondary, #64748b)); }
.pg-profile__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: var(--pg-profile-avatar-fit, cover);
}

/* min-width: 0 on both the text block and its lines is what lets the ellipsis
   happen at all — a flex item defaults to min-content, which refuses to shrink
   below the longest word. */
.pg-profile__text {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
}
.pg-profile--stacked .pg-profile__text {
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}
.pg-profile--inline .pg-profile__text {
  flex-direction: row;
  align-items: baseline;
  gap: var(--pg-spacing-xs, 4px);
}
.pg-profile__title,
.pg-profile__subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-profile__title {
  color: var(--pg-colors-text-primary, #0f172a);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  line-height: var(--pg-typography-line-height-tight, 1.3);
}
.pg-profile__subtitle {
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
  line-height: var(--pg-typography-line-height-tight, 1.3);
}
.pg-profile--inline .pg-profile__subtitle { flex: 0 1 auto; }
.pg-profile__separator {
  flex: 0 0 auto;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: var(--pg-typography-font-size-xs, 11px);
}

/* ── Country ──────────────────────────────────────────────────────────────── */
.pg-cell__value--country {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
  min-width: 0;
}
.pg-cell-flag {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  line-height: 1;
}
/* Flags are wider than they are tall, so a rounded corner and a hairline
   border are what stop a white flag (Japan, Switzerland) from dissolving into
   the row behind it. */
.pg-cell-flag__img {
  display: block;
  border-radius: var(--pg-borders-radius-sm, 2px);
  object-fit: cover;
}
/* Emoji flags are drawn a touch small against body text at the same size. */
.pg-cell-flag--emoji {
  font-size: calc(var(--pg-typography-font-size-md, 13px) * 1.15);
}
.pg-cell-country__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Pills ────────────────────────────────────────────────────────────────── */
/* .pg-badge, .pg-badge--overflow and .pg-cell__value--tags are already defined
   (in context-menu.css.ts and editors.css.ts) and are not repeated here — only
   the variants this feature adds are. */
.pg-badge--chip {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
}
.pg-badge--tag { font-weight: var(--pg-typography-font-weight-medium, 500); }
.pg-cell__value--badge,
.pg-cell__value--chip,
.pg-cell__value--tag {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
  min-width: 0;
  overflow: hidden;
}

/* ── Icon ─────────────────────────────────────────────────────────────────── */
.pg-cell__value--icon {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
}
.pg-cell-icon__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Progress ─────────────────────────────────────────────────────────────── */
.pg-cell__value--progress {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm, 8px);
  width: 100%;
  min-width: 0;
}
.pg-cell-progress {
  flex: 1 1 auto;
  min-width: 24px;
  height: var(--pg-progress-height, 6px);
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  overflow: hidden;
}
/* The fill is a scale transform rather than a width so an update is a
   compositor-only change — no layout, no paint of the track. */
.pg-cell-progress__fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  transform: scaleX(var(--pg-progress-fraction, 0));
  background: var(--pg-progress-color, var(--pg-colors-primary, #2563eb));
  transition: transform var(--pg-transitions-duration-base, 150ms)
    var(--pg-transitions-easing-base, ease);
}
.pg-cell-progress__label {
  flex: 0 0 auto;
  font-size: var(--pg-typography-font-size-xs, 11px);
  color: var(--pg-colors-text-secondary, #64748b);
  font-variant-numeric: tabular-nums;
}

/* ── Rating ───────────────────────────────────────────────────────────────── */
.pg-cell__value--rating {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}
.pg-cell-rating__item {
  display: inline-flex;
  color: var(--pg-colors-border-strong, #cbd5e1);
}
.pg-cell-rating__item--on { color: var(--pg-colors-warning, #f59e0b); }
.pg-cell-rating__value {
  margin-left: var(--pg-spacing-xs, 4px);
  font-size: var(--pg-typography-font-size-xs, 11px);
  color: var(--pg-colors-text-secondary, #64748b);
  font-variant-numeric: tabular-nums;
}

/* ── Avatar group ─────────────────────────────────────────────────────────── */
/* Sizes are a named scale, set once as custom properties and consumed by every
   rule below, so a variant retunes the whole component by overriding two
   values rather than a dozen declarations. */
.pg-avatar-group--xs { --pg-avatar-size: 18px; --pg-avatar-overlap: 4px; }
.pg-avatar-group--sm { --pg-avatar-size: 24px; --pg-avatar-overlap: 6px; }
.pg-avatar-group--md { --pg-avatar-size: 30px; --pg-avatar-overlap: 8px; }
.pg-avatar-group--lg { --pg-avatar-size: 38px; --pg-avatar-overlap: 10px; }

.pg-cell__value--avatar-group {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}
.pg-avatar-group {
  display: inline-flex;
  align-items: center;
  /* A negative margin on every item after the first is what produces the
     overlap. Reversing the flex direction would stack them the other way but
     also reverse the reading order for a screen reader, so the z-index rules
     below do that job instead. */
  padding-inline-start: var(--pg-avatar-overlap, 8px);
}
.pg-avatar-group__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 auto;
  width: var(--pg-avatar-size, 24px);
  height: var(--pg-avatar-size, 24px);
  margin-inline-start: calc(var(--pg-avatar-overlap, 8px) * -1);
  border-radius: var(--pg-borders-radius-pill, 9999px);
  /* The ring is what separates one avatar from the one it overlaps. It is the
     row background rather than a border colour so the stack reads correctly on
     hovered, selected and striped rows alike. */
  box-shadow: 0 0 0 2px var(--pg-colors-row-background, #fff);
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  overflow: hidden;
  font-size: calc(var(--pg-avatar-size, 24px) * 0.4);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  line-height: 1;
}
/* Earlier avatars sit above later ones, so the stack reads left-to-right the
   way the eye scans it. */
.pg-avatar-group__item:nth-child(1) { z-index: 6; }
.pg-avatar-group__item:nth-child(2) { z-index: 5; }
.pg-avatar-group__item:nth-child(3) { z-index: 4; }
.pg-avatar-group__item:nth-child(4) { z-index: 3; }
.pg-avatar-group__item:nth-child(5) { z-index: 2; }
.pg-avatar-group__item:nth-child(n + 6) { z-index: 1; }

.pg-avatar-group__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pg-avatar-group__item--initials {
  background: var(--pg-avatar-color, var(--pg-colors-primary, #2563eb));
  color: #fff;
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.02em);
}
/* The counter is a real button, so its own appearance has to be reset before
   the shared item rules can take effect. */
.pg-avatar-group__more {
  padding: 0;
  border: none;
  font-family: inherit;
  cursor: pointer;
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  color: var(--pg-colors-text-secondary, #64748b);
  transition: background var(--pg-transitions-duration-fast, 120ms)
    var(--pg-transitions-easing-base, ease);
}
.pg-avatar-group__more:hover:not(:disabled) {
  background: var(--pg-colors-border-strong, #cbd5e1);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-avatar-group__more:disabled { cursor: default; }
.pg-avatar-group__more:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}

/* ── Avatar group overlay ─────────────────────────────────────────────────── */
/* Fixed, and on document.body: anchored inside the grid it would be clipped by
   the scroll container and would scroll away from its own trigger. The two
   coordinates arrive as custom properties because position is genuinely
   dynamic — everything else about the panel stays in this stylesheet. */
.pg-avatar-overlay {
  position: fixed;
  top: var(--pg-overlay-y, 0);
  left: var(--pg-overlay-x, 0);
  z-index: var(--pg-z-overlay, 1200);
  display: none;
  box-sizing: border-box;
  width: var(--pg-avatar-overlay-width, 240px);
  max-height: var(--pg-overlay-max-height, 320px);
  overflow-y: auto;
  padding: var(--pg-spacing-xs, 4px);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 8px);
  background: var(--pg-colors-surface-overlay, #fff);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: var(--pg-typography-font-size-sm, 12px);
}
.pg-avatar-overlay--open { display: block; }
.pg-avatar-overlay:focus { outline: none; }

.pg-avatar-overlay__title {
  padding: var(--pg-spacing-xs, 4px) var(--pg-spacing-sm, 8px);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  text-transform: uppercase;
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.04em);
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-avatar-overlay__list { display: flex; flex-direction: column; }

.pg-avatar-overlay__row {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm, 8px);
  width: 100%;
  box-sizing: border-box;
  padding: var(--pg-spacing-xs, 4px) var(--pg-spacing-sm, 8px);
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  min-width: 0;
}
.pg-avatar-overlay__row--interactive { cursor: pointer; }
.pg-avatar-overlay__row--interactive:hover {
  background: var(--pg-colors-row-hover, #f0f7ff);
}
.pg-avatar-overlay__row--interactive:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: -2px;
}

.pg-avatar-overlay__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--pg-avatar-overlay-size, 26px);
  height: var(--pg-avatar-overlay-size, 26px);
  border-radius: var(--pg-borders-radius-pill, 9999px);
  overflow: hidden;
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
}
.pg-avatar-overlay__avatar--initials {
  background: var(--pg-avatar-color, var(--pg-colors-primary, #2563eb));
  color: #fff;
}
.pg-avatar-overlay__img { width: 100%; height: 100%; object-fit: cover; display: block; }

.pg-avatar-overlay__text { min-width: 0; }
.pg-avatar-overlay__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-avatar-overlay__detail {
  font-size: var(--pg-typography-font-size-xs, 11px);
  color: var(--pg-colors-text-secondary, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Switch ───────────────────────────────────────────────────────────────── */
/* Built from the same checkbox input the checkbox renderer uses, so it keeps
   native semantics, keyboard behaviour and the delegated toggle handler; only
   the painting differs.

   Selectors are input.pg-cell-checkbox--switch, not the bare class.
   .pg-cell-checkbox sets a 16x16 box and lives in a stylesheet module
   concatenated after this one, so at equal specificity it would win and squash
   the track into a circle. Element + class outranks it regardless of source
   order, which makes these rules independent of the module ordering in
   base-styles.ts. */
input.pg-cell-checkbox--switch {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  width: var(--pg-switch-width, 30px);
  height: var(--pg-switch-height, 18px);
  padding: 0;
  margin: 0;
  border: none;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-border-strong, #cbd5e1);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 120ms)
    var(--pg-transitions-easing-base, ease);
}
/* The knob. Inset by --pg-switch-gap on every side, so its size and travel are
   both derived from the track — change the track and the knob follows. */
input.pg-cell-checkbox--switch::after {
  content: '';
  position: absolute;
  top: var(--pg-switch-gap, 2px);
  left: var(--pg-switch-gap, 2px);
  width: calc(var(--pg-switch-height, 18px) - (var(--pg-switch-gap, 2px) * 2));
  height: calc(var(--pg-switch-height, 18px) - (var(--pg-switch-gap, 2px) * 2));
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-surface, #fff);
  box-shadow: var(--pg-shadows-xs, 0 1px 2px rgba(15, 23, 42, 0.25));
  transition: transform var(--pg-transitions-duration-fast, 120ms)
    var(--pg-transitions-easing-base, ease);
}
input.pg-cell-checkbox--switch:checked {
  background: var(--pg-colors-primary, #2563eb);
}
input.pg-cell-checkbox--switch:checked::after {
  transform: translateX(
    calc(var(--pg-switch-width, 30px) - var(--pg-switch-height, 18px))
  );
}
input.pg-cell-checkbox--switch:hover:not(:disabled) {
  background: var(--pg-colors-text-disabled, #94a3b8);
}
input.pg-cell-checkbox--switch:checked:hover:not(:disabled) {
  background: var(--pg-colors-primary-hover, #1d4ed8);
}
input.pg-cell-checkbox--switch:disabled {
  cursor: default;
  opacity: var(--pg-opacity-disabled, 0.65);
}
input.pg-cell-checkbox--switch:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: 2px;
}

/* ── Button ───────────────────────────────────────────────────────────────── */
.pg-cell-button {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
  padding: 2px var(--pg-spacing-sm, 8px);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: inherit;
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--pg-transitions-duration-fast, 100ms)
    var(--pg-transitions-easing-base, ease);
}
.pg-cell-button:hover:not(:disabled) { background: var(--pg-colors-row-hover, #f0f7ff); }
.pg-cell-button:disabled {
  cursor: default;
  opacity: var(--pg-opacity-disabled, 0.65);
}
.pg-cell-button--primary {
  background: var(--pg-colors-primary, #2563eb);
  border-color: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-on-primary, #fff);
}
.pg-cell-button--primary:hover:not(:disabled) {
  background: var(--pg-colors-primary-hover, #1d4ed8);
}
.pg-cell-button--danger {
  background: var(--pg-colors-error, #dc2626);
  border-color: var(--pg-colors-error, #dc2626);
  color: #fff;
}

/* ── Actions ──────────────────────────────────────────────────────────────── */
/* Tone is expressed as two custom properties — an accent and the text drawn on
   it — set once per variant and consumed by every rule below. A variant
   therefore restyles by naming two colours instead of redeclaring the button. */
.pg-cell__value--actions {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
}
.pg-actions {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-xs, 4px);
  min-width: 0;
  width: 100%;
}
.pg-actions--start { justify-content: flex-start; }
.pg-actions--center { justify-content: center; }
.pg-actions--end { justify-content: flex-end; }
.pg-actions--sm { --pg-action-padding-y: 2px; --pg-action-font-size: var(--pg-typography-font-size-xs, 11px); }
.pg-actions--md { --pg-action-padding-y: 4px; --pg-action-font-size: var(--pg-typography-font-size-sm, 12px); }

.pg-action {
  --pg-action-accent: var(--pg-colors-border-strong, #cbd5e1);
  --pg-action-on-accent: var(--pg-colors-text-primary, #0f172a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  gap: var(--pg-spacing-xs, 4px);
  box-sizing: border-box;
  padding: var(--pg-action-padding-y, 2px) var(--pg-spacing-sm, 8px);
  border: 1px solid var(--pg-action-accent);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-action-on-accent);
  font-family: inherit;
  font-size: var(--pg-action-font-size, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms)
    var(--pg-transitions-easing-base, ease);
}
.pg-action:hover:not(:disabled) { background: var(--pg-colors-row-hover, #f0f7ff); }
.pg-action:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-action:disabled {
  cursor: default;
  opacity: var(--pg-opacity-disabled, 0.65);
}
.pg-action__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
/* An icon-only button is square rather than a wide pill with a glyph adrift in
   it — the padding that reads correctly beside a label is too much without one. */
.pg-action:not(:has(.pg-action__label)) {
  padding-inline: var(--pg-spacing-xs, 4px);
}

.pg-action--secondary {
  --pg-action-accent: var(--pg-colors-border, #e2e8f0);
  --pg-action-on-accent: var(--pg-colors-text-primary, #0f172a);
}
.pg-action--primary {
  --pg-action-accent: var(--pg-colors-primary, #2563eb);
  --pg-action-on-accent: var(--pg-colors-on-primary, #fff);
  background: var(--pg-action-accent);
}
.pg-action--primary:hover:not(:disabled) { background: var(--pg-colors-primary-hover, #1d4ed8); }
/* The consequential tones stay outlined rather than filled: a row of solid
   red and amber buttons repeated down a column reads as an error state. The
   accent carries the meaning through the border and the text. */
.pg-action--success {
  --pg-action-accent: var(--pg-colors-success, #16a34a);
  --pg-action-on-accent: var(--pg-colors-success, #16a34a);
}
.pg-action--warning {
  --pg-action-accent: var(--pg-colors-warning, #f59e0b);
  --pg-action-on-accent: var(--pg-colors-warning, #f59e0b);
}
.pg-action--danger {
  --pg-action-accent: var(--pg-colors-error, #dc2626);
  --pg-action-on-accent: var(--pg-colors-error, #dc2626);
}
.pg-action--ghost {
  --pg-action-accent: transparent;
  --pg-action-on-accent: var(--pg-colors-text-secondary, #64748b);
  background: transparent;
}
.pg-action--menu { padding-inline: var(--pg-spacing-xs, 4px); }
.pg-action--menu[aria-expanded='true'] {
  background: var(--pg-colors-surface-sunken, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
/* Busy: the control is already disabled by the executor, so this only has to
   say why. A pulse rather than a spinner keeps it to one property and no extra
   element inside a button that may be 20px wide. */
.pg-action--busy {
  opacity: var(--pg-opacity-disabled, 0.65);
  animation: pg-action-pulse var(--pg-transitions-duration-slow, 900ms)
    var(--pg-transitions-easing-base, ease) infinite alternate;
}
@keyframes pg-action-pulse {
  from { opacity: var(--pg-opacity-disabled, 0.65); }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .pg-action--busy { animation: none; }
}

/* ── Actions menu ─────────────────────────────────────────────────────────── */
/* Fixed, and on document.body: anchored inside the grid it would be clipped by
   the scroll container and would scroll away from its own trigger. The two
   coordinates arrive as custom properties because position is genuinely
   dynamic — everything else about the panel stays in this stylesheet. */
.pg-actions-menu {
  position: fixed;
  top: var(--pg-overlay-y, 0);
  left: var(--pg-overlay-x, 0);
  z-index: var(--pg-z-overlay, 1200);
  display: none;
  box-sizing: border-box;
  min-width: var(--pg-actions-menu-width, 160px);
  max-height: var(--pg-overlay-max-height, 320px);
  overflow-y: auto;
  padding: var(--pg-spacing-xs, 4px);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 8px);
  background: var(--pg-colors-surface-overlay, #fff);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: var(--pg-typography-font-size-sm, 12px);
}
.pg-actions-menu--open { display: block; }
.pg-actions-menu:focus { outline: none; }
.pg-actions-menu__title {
  padding: var(--pg-spacing-xs, 4px) var(--pg-spacing-sm, 8px);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-semibold, 600);
  text-transform: uppercase;
  letter-spacing: var(--pg-typography-letter-spacing-wide, 0.04em);
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-actions-menu__title--hidden { display: none; }
.pg-actions-menu__list { display: flex; flex-direction: column; }

.pg-actions-menu__item {
  display: flex;
  align-items: center;
  gap: var(--pg-spacing-sm, 8px);
  width: 100%;
  box-sizing: border-box;
  padding: var(--pg-spacing-xs, 4px) var(--pg-spacing-sm, 8px);
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.pg-actions-menu__item:hover:not(:disabled) {
  background: var(--pg-colors-row-hover, #f0f7ff);
}
.pg-actions-menu__item:focus-visible {
  outline: var(--pg-borders-width-focus, 2px) solid var(--pg-colors-primary, #2563eb);
  outline-offset: -2px;
}
.pg-actions-menu__item:disabled {
  cursor: default;
  opacity: var(--pg-opacity-disabled, 0.65);
}
.pg-actions-menu__item--danger { color: var(--pg-colors-error, #dc2626); }
.pg-actions-menu__item--warning { color: var(--pg-colors-warning, #f59e0b); }
.pg-actions-menu__item--success { color: var(--pg-colors-success, #16a34a); }
.pg-actions-menu__item--primary { color: var(--pg-colors-primary, #2563eb); }
/* Fixed-width slot, occupied or not, so labels line up down the menu instead
   of stepping in and out with each item's icon. */
.pg-actions-menu__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}
.pg-actions-menu__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;
