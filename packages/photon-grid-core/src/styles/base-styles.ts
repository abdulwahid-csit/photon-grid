import { themeQuartzCss }   from './themes/theme-quartz';
import { themeAlpineCss }   from './themes/theme-alpine';
import { themeBalhamCss }   from './themes/theme-balham';
import { themeMaterialCss } from './themes/theme-material';
import { themeDarkCss }     from './themes/theme-dark';

// Base styles are authored as focused per-feature modules under ./base/ for
// maintainability, then concatenated here in a FIXED order. The order matters:
// CSS cascade resolves same-specificity conflicts by source order, so these
// must be joined exactly as listed (edit the individual ./base/*.css.ts files,
// not this list's ordering, unless you intend to change the cascade).
import { rootCss }              from './base/root.css';
import { groupDropZoneCss }     from './base/group-drop-zone.css';
import { groupBarSearchCss }    from './base/group-bar-search.css';
import { panelsCss }            from './base/panels.css';
import { headerCss }            from './base/header.css';
import { columnGroupHeaderCss } from './base/column-group-header.css';
import { filterCss }            from './base/filter.css';
import { rowsCss }              from './base/rows.css';
import { cellsCss }             from './base/cells.css';
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
import { columnContextMenuCss } from './base/column-context-menu.css';
import { masterDetailCss }      from './base/master-detail.css';
import { photonAiCss }          from './base/photon-ai.css';
import { tooltipCss }           from './base/tooltip.css';
import { chartConfigCss }       from './base/chart-config.css';
import { chartControlsCss }     from './base/chart-controls.css';

const STYLE_ID = 'photon-grid-base-styles';

// Joined with '' (not '\n') so the output is byte-identical to the original
// single template: each module already carries its own leading/trailing
// whitespace from the split.
const baseCss = [
  rootCss,
  groupDropZoneCss,
  groupBarSearchCss,
  panelsCss,
  headerCss,
  columnGroupHeaderCss,
  filterCss,
  rowsCss,
  cellsCss,
  contextMenuCss,
  rowGroupCss,
  treeCss,
  scrollbarsCss,
  editorsCss,
  footerCss,
  miscCss,
  rowDragCss,
  chartPanelCss,
  sparklineCss,
  columnContextMenuCss,
  masterDetailCss,
  photonAiCss,
  tooltipCss,
  chartConfigCss,
  chartControlsCss,
].join('');

const css = [baseCss, themeQuartzCss, themeAlpineCss, themeBalhamCss, themeMaterialCss, themeDarkCss].join('\n');

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
