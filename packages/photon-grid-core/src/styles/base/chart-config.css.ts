/**
 * Styles for the chart configuration drawer (Chart / Set Up / Customize tabs).
 * The drawer is a child of the chart panel body: it is anchored to the right
 * edge and slides in (right → left) when opened and out (left → right) when
 * closed via a `transform` transition. All colors, spacing and fonts come from
 * Photon theme tokens so the drawer matches light / dark / custom themes with no
 * hardcoded values.
 */
export const chartConfigCss = `
.pg-chart-config {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  width: 264px;
  max-width: 85%;
  display: flex;
  flex-direction: column;
  background: var(--pg-colors-surface, #fff);
  border-left: 1px solid var(--pg-colors-border, #e2e8f0);
  // box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
  overflow: hidden;
  transform: translateX(100%);
  transition: transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
}
.pg-chart-config--open { transform: translateX(0); }
@media (prefers-reduced-motion: reduce) {
  .pg-chart-config { transition: none; }
}
.pg-chart-config__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 0 6px;
  border-bottom: 1px solid var(--pg-colors-border, #e2e8f0);
  flex-shrink: 0;
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
  min-height: 0;
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
  display: block;
  height: 58px;
  padding: 3px;
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-radius: 6px;
  background: var(--pg-colors-surface, #fff);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 80ms, background 80ms, box-shadow 80ms;
}
.pg-chart-config__gallery-item:hover {
  border-color: var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-background-alt, #f1f5f9);
}
.pg-chart-config__gallery-item--active {
  border-color: var(--pg-colors-primary, #2563eb);
  background: var(--pg-colors-background-alt, #f1f5f9);
  box-shadow: 0 0 0 1px var(--pg-colors-primary, #2563eb) inset;
}
.pg-chart-config__gallery-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
`;
