/**
 * Photon Grid base styles — column-context-menu section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const columnContextMenuCss = `/* ──────────────────── Column Context Menu ──────────────────── */

/* Menu container — fixed-position dropdown attached to document.body.
   Height is capped so the menu never grows into the viewport's top/bottom
   200px; content beyond that scrolls internally via overflow-y instead of
   being clipped. Fly-out submenus (.pg-col-ctx-menu__submenu) are portaled to
   document.body while open rather than nested here, so this container's
   scroll clipping never cuts them off on the X axis. */
.pg-col-ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  max-width: 300px;
  max-height: calc(100% - 200px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
  user-select: none;
  outline: none;
  /* Theme the internal overflow scrollbar so it matches the surface in dark
     mode too (the menu is portaled to <body>, outside the grid's own
     scrollbar styling — these tokens are mirrored onto :root by ThemeManager). */
  scrollbar-width: thin;
  scrollbar-color: var(--pg-colors-scrollbar-thumb, #cbd5e1) var(--pg-colors-scrollbar-track, #f1f5f9);
}

/* Horizontal divider between section groups.
   Uses the themed border token — a non-existent token here would fall back to
   a hardcoded light value and paint a bright line in dark mode. */
.pg-col-ctx-menu__separator {
  height: 1px;
  background: var(--pg-colors-border, #e2e8f0);
  margin: 4px 0;
}

/* ── Menu items ─────────────────────────────────────────────── */

/* Base item — covers both leaf items and parent (submenu-trigger) items */
.pg-col-ctx-menu__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 80ms) ease;
  outline: none;
  white-space: nowrap;
}

/* Hover / keyboard-focus background. Uses header-hover (distinct from the menu
   surface in both light and dark themes) rather than background-alt, which
   collapses to the surface colour in dark mode and leaves hover invisible. */
.pg-col-ctx-menu__item:hover,
.pg-col-ctx-menu__item:focus-visible {
  background: var(--pg-colors-header-hover, #f1f5f9);
}

/* Highlighted / "currently applied" item (e.g. active sort direction) */
.pg-col-ctx-menu__item--active {
  color: var(--pg-colors-primary, #2563eb);
  font-weight: 600;
}

/* Trailing check mark for a currently-selected leaf (e.g. the chosen aggregate). */
.pg-col-ctx-menu__item-check {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-left: 12px;
  color: var(--pg-colors-primary, #2563eb);
}

/* Disabled item — rendered but not interactive */
.pg-col-ctx-menu__item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── Item anatomy ────────────────────────────────────────────── */

/* Leading icon */
.pg-col-ctx-menu__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

.pg-col-ctx-menu__item--active .pg-col-ctx-menu__item-icon {
  opacity: 1;
}

/* Text label — fills remaining space */
.pg-col-ctx-menu__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Trailing chevron indicating a fly-out submenu */
.pg-col-ctx-menu__item-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  opacity: 0.4;
  margin-left: 4px;
  transition: opacity var(--pg-transitions-duration-fast, 80ms) ease;
}

.pg-col-ctx-menu__item--has-submenu:hover .pg-col-ctx-menu__item-chevron {
  opacity: 0.75;
}

/* ── Fly-out submenu ─────────────────────────────────────────── */

/* Hidden by default; shown when JS adds --open. Positioned fixed rather than
   absolute-within-parent because it is portaled to document.body while open
   (see ColumnMenu.openSubmenu) — left/top are set inline in viewport
   coordinates by adjustSubmenuPosition. */
.pg-col-ctx-menu__submenu {
  display: none;
  position: fixed;
  min-width: 180px;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  box-shadow: var(--pg-shadows-dropdown, 0 8px 24px rgba(15, 23, 42, 0.12));
  z-index: 10000;
}

/* JS-controlled open state */
.pg-col-ctx-menu__submenu--open {
  display: block;
}

/* Invisible hover bridge — prevents flicker when mouse crosses from
   parent item edge into the submenu. Extends 6px to the left of the submenu. */
.pg-col-ctx-menu__submenu--open::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 0;
  width: 8px;
  height: 100%;
}

`;
