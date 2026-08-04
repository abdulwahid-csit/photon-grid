import { themeIonCss }      from './themes/theme-ion';
import { themeNeonCss }     from './themes/theme-neon';
import { themePhotonCss }   from './themes/theme-photon';
import { themeQuantumCss }  from './themes/theme-quantum';

// Base styles are authored as focused per-feature modules under ./base/ for
// maintainability, then concatenated here in a FIXED order. The order matters:
// CSS cascade resolves same-specificity conflicts by source order, so these
// must be joined exactly as listed (edit the individual ./base/*.css.ts files,
// not this list's ordering, unless you intend to change the cascade).
import { rootCss }              from './base/root.css';
import { groupDropZoneCss }     from './base/group-drop-zone.css';
import { groupBarSearchCss }    from './base/group-bar-search.css';
import { panelsCss }            from './base/panels.css';
import { summaryCss }           from './base/summary.css';
import { headerCss }            from './base/header.css';
import { columnGroupHeaderCss } from './base/column-group-header.css';
import { filterCss }            from './base/filter.css';
import { rowsCss }              from './base/rows.css';
import { cellsCss }             from './base/cells.css';
import { builtInRenderersCss }  from './base/built-in-renderers.css';
import { contextMenuCss }       from './base/context-menu.css';
import { rowGroupCss }          from './base/row-group.css';
import { treeCss }              from './base/tree.css';
import { scrollbarsCss }        from './base/scrollbars.css';
import { editorsCss }           from './base/editors.css';
import { footerCss }            from './base/footer.css';
import { miscCss }              from './base/misc.css';
import { rowDragCss }           from './base/row-drag.css';
import { chartPanelCss }        from './base/chart-panel.css';
import { sparklineCss }         from './base/sparkline.css';
import { skeletonCss }          from './base/skeleton.css';
import { columnContextMenuCss } from './base/column-context-menu.css';
import { masterDetailCss }      from './base/master-detail.css';
import { photonAiCss }          from './base/photon-ai.css';
import { tooltipCss }           from './base/tooltip.css';
import { chartConfigCss }       from './base/chart-config.css';
import { chartControlsCss }     from './base/chart-controls.css';
import { columnChooserCss }     from './base/column-chooser.css';
import { filtersToolPanelCss }  from './base/filters-tool-panel.css';
import { importMenuCss }        from './base/import-menu.css';
import { toolbarCss }           from './base/toolbar.css';
import { themeManagerCss }      from './base/theme-manager.css';
import { toastCss }             from './base/toast.css';
import { pluginLayerCss }  from './base/plugin-layer.css';
import { touchCss }             from './base/touch.css';

const STYLE_ID = 'photon-grid-base-styles';

// Joined with '' (not '\n') so the output is byte-identical to the original
// single template: each module already carries its own leading/trailing
// whitespace from the split.
const baseCss = [
  rootCss,
  groupDropZoneCss,
  groupBarSearchCss,
  panelsCss,
  summaryCss,
  headerCss,
  columnGroupHeaderCss,
  filterCss,
  rowsCss,
  cellsCss,
  contextMenuCss,
  // After the modules that define the base cell primitives it refines
  // (`.pg-cell__value` in cellsCss; `.pg-badge` and `.pg-cell-checkbox` in
  // contextMenuCss), so a renderer variant wins a same-specificity tie against
  // the base rule rather than losing to it. Rules that must also outrank a
  // module further down the list raise their own specificity — see the switch.
  builtInRenderersCss,
  rowGroupCss,
  treeCss,
  scrollbarsCss,
  editorsCss,
  footerCss,
  miscCss,
  rowDragCss,
  chartPanelCss,
  sparklineCss,

  skeletonCss,
  columnContextMenuCss,
  masterDetailCss,
  photonAiCss,
  tooltipCss,
  chartConfigCss,
  chartControlsCss,
  columnChooserCss,
  filtersToolPanelCss,
  importMenuCss,
  toolbarCss,
  themeManagerCss,
  toastCss,
  touchCss,
  // Last: plugin layers stack above everything the grid draws itself, so their
  // structural rules should win any same-specificity tie.
  pluginLayerCss,
].join('');

// Variant skins are appended after the base rules. Each is a cosmetic layer
// (density, radii, typography, accent) that composes with either color mode;
// the light/dark palettes themselves are injected as tokens by ThemeManager,
// so no class-based dark skin is bundled here.
const css = [baseCss, themeIonCss, themeNeonCss, themePhotonCss, themeQuantumCss].join('\n');

export function injectBaseStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

export function removeBaseStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}
