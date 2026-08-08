/**
 * Photon Grid base styles — export-menu section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Order is
 * preserved because CSS cascade depends on it.
 *
 * Every value is a theme variable (with a sensible fallback) so the Export
 * launcher, dropdown and menu items re-theme with the rest of the grid — light,
 * dark and custom themes — with zero inline styles anywhere in the component.
 * The rules mirror `import-menu.css.ts` deliberately: the two launchers sit side
 * by side in the same strip and must read as one control group.
 */
export const exportMenuCss = `/* ──────────────────── Export Menu ──────────────────── */

/* Launcher — an "Export" pill living in the shared .pg-grid__tools bar
   (see filters-tool-panel.css.ts). 'order' places it after the Import pill;
   the bar handles absolute positioning and stacking. */
.pg-export-launcher {
  order: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-secondary, #64748b);
  box-shadow: var(--pg-shadows-sm, 0 1px 2px rgba(15, 23, 42, 0.08));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    border-color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-export-launcher:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
  border-color: var(--pg-colors-border-strong, #cbd5e1);
}
.pg-export-launcher:focus-visible {
  outline: 2px solid var(--pg-colors-primary, #2563eb);
  outline-offset: 1px;
}
.pg-export-launcher__icon,
.pg-export-launcher__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pg-export-launcher__icon svg,
.pg-export-launcher__caret svg { display: block; }
.pg-export-launcher__caret { color: var(--pg-colors-text-disabled, #94a3b8); }
.pg-export-launcher__label { line-height: 1; }

/* Dropdown menu — anchored below the launcher, clipped to the grid. */
.pg-export-menu {
  position: absolute;
  top: 48px;
  right: 8px;
  z-index: var(--pg-z-index-filter-panel, 200);
  min-width: 200px;
  display: none;
  flex-direction: column;
  padding: 4px;
  background: var(--pg-colors-surface, #ffffff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-export-menu--open { display: flex; }

.pg-export-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-export-menu__item:hover,
.pg-export-menu__item:focus-visible {
  background: var(--pg-colors-selection-background, rgba(37, 99, 235, 0.12));
  outline: none;
}
.pg-export-menu__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-colors-text-secondary, #64748b);
}
.pg-export-menu__item-icon svg { display: block; }
.pg-export-menu__item-label { flex: 1; line-height: 1.2; }

/* "Setup" hint on a format whose exporter is not registered yet. Deliberately a
   badge rather than a disabled state: the entry stays clickable so selecting it
   can explain the one-time setup. Muted, so an available format still reads as
   the primary path. */
.pg-export-menu__item-hint {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-disabled, #94a3b8);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  line-height: 1.4;
  letter-spacing: 0.02em;
}
.pg-export-menu__item--needs-setup .pg-export-menu__item-icon {
  color: var(--pg-colors-text-disabled, #94a3b8);
}
`;
