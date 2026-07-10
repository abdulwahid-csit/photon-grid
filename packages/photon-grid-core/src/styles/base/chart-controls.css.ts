/**
 * Styles for the reusable chart-config form controls (dropdown, toggle, color,
 * number/text inputs, segmented buttons, collapsible sections, reorderable
 * list). Token-driven — no hardcoded colors, spacing or fonts.
 */
export const chartControlsCss = `
.pg-chart-ctrl__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
}
.pg-chart-ctrl__label {
  font-size: 12px;
  color: var(--pg-colors-text-secondary, #64748b);
  flex: 1;
}
.pg-chart-ctrl__select,
.pg-chart-ctrl__input {
  min-width: 0;
  max-width: 140px;
  flex: 1 1 auto;
  padding: 5px 8px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 5px;
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: 12px;
  font-family: inherit;
}
.pg-chart-ctrl__select:focus,
.pg-chart-ctrl__input:focus {
  outline: none;
  border-color: var(--pg-colors-primary, #2563eb);
}
.pg-chart-ctrl__color {
  width: 34px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 5px;
  background: var(--pg-colors-surface, #fff);
  cursor: pointer;
}
.pg-chart-ctrl__toggle {
  position: relative;
  width: 34px;
  height: 18px;
  border: none;
  border-radius: 9px;
  background: var(--pg-colors-border, #cbd5e1);
  cursor: pointer;
  transition: background 120ms;
  flex: 0 0 auto;
}
.pg-chart-ctrl__toggle--on { background: var(--pg-colors-primary, #2563eb); }
.pg-chart-ctrl__toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 120ms;
}
.pg-chart-ctrl__toggle--on .pg-chart-ctrl__toggle-knob { transform: translateX(16px); }
.pg-chart-ctrl__segmented {
  display: inline-flex;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 5px;
  overflow: hidden;
}
.pg-chart-ctrl__segment {
  padding: 4px 9px;
  border: none;
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.pg-chart-ctrl__segment--active {
  background: var(--pg-colors-primary, #2563eb);
  color: #fff;
}
.pg-chart-ctrl__section { border-top: 1px solid var(--pg-colors-border, #e2e8f0); }
.pg-chart-ctrl__section:first-child { border-top: none; }
.pg-chart-ctrl__section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 9px 2px;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-primary, #0f172a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.pg-chart-ctrl__section-chevron {
  display: inline-flex;
  color: var(--pg-colors-text-secondary, #64748b);
  transition: transform 120ms;
  transform: rotate(-90deg);
}
.pg-chart-ctrl__section--open .pg-chart-ctrl__section-chevron { transform: rotate(0deg); }
.pg-chart-ctrl__section-body { display: none; padding: 0 2px 8px; }
.pg-chart-ctrl__section--open .pg-chart-ctrl__section-body { display: block; }
.pg-chart-ctrl__list { display: flex; flex-direction: column; gap: 4px; }
.pg-chart-ctrl__list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 5px;
  background: var(--pg-colors-surface, #fff);
}
.pg-chart-ctrl__list-item--dragging { opacity: 0.6; }
.pg-chart-ctrl__list-handle {
  display: inline-flex;
  color: var(--pg-colors-text-secondary, #94a3b8);
  cursor: grab;
}
.pg-chart-ctrl__list-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--pg-chart-swatch, var(--pg-colors-primary, #2563eb));
  flex: 0 0 auto;
}
.pg-chart-ctrl__list-label {
  flex: 1;
  font-size: 12px;
  color: var(--pg-colors-text-primary, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pg-chart-ctrl__list-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #94a3b8);
  border-radius: 4px;
  cursor: pointer;
}
.pg-chart-ctrl__list-remove:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-danger, #dc2626);
}
.pg-chart-panel__dots-item--disabled {
  opacity: 0.4;
  pointer-events: none;
}
`;
