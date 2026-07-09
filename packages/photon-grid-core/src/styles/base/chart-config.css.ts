/**
 * Styles for the docked chart configuration tool panel (Chart / Set Up /
 * Customize tabs). All colors, spacing and fonts come from Photon theme tokens
 * so the panel matches light / dark / custom themes with no hardcoded values.
 */
export const chartConfigCss = `
.pg-chart-config {
  position: fixed;
  z-index: 10001;
  width: 264px;
  display: flex;
  flex-direction: column;
  background: var(--pg-colors-surface, #fff);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
  overflow: hidden;
}
.pg-chart-config__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 0 6px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
}
.pg-chart-config__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  border-radius: 4px;
  cursor: pointer;
}
.pg-chart-config__close:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-chart-config__tabs {
  display: flex;
  gap: 2px;
  flex: 1;
}
.pg-chart-config__tab {
  flex: 1;
  padding: 8px 6px;
  border: none;
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-family: inherit;
}
.pg-chart-config__tab:hover { color: var(--pg-colors-text-primary, #0f172a); }
.pg-chart-config__tab--active {
  color: var(--pg-colors-primary, #2563eb);
  border-bottom-color: var(--pg-colors-primary, #2563eb);
}
.pg-chart-config__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}
.pg-chart-config__group-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pg-colors-text-secondary, #64748b);
  margin: 10px 0 6px;
}
.pg-chart-config__gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.pg-chart-config__gallery-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 6px;
  background: var(--pg-colors-surface, #fff);
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition: border-color 80ms, color 80ms;
}
.pg-chart-config__gallery-item:hover {
  border-color: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-chart-config__gallery-item--active {
  border-color: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-chart-config__gallery-icon { display: inline-flex; }
.pg-chart-config__gallery-label { font-size: 10px; }
`;
