import fs from 'node:fs';
import path from 'node:path';

const DOCS = path.resolve('docs');

// new-path (relative to docs/) -> original-path (relative to docs/)
const newToOrig = {
  'charting/overview.md': 'CHARTING/Integrated/Overview.md',
  'charting/installation.md': 'CHARTING/Integrated/Installation.md',
  'charting/chart-types.md': 'CHARTING/Integrated/Chart Types.md',
  'charting/range-charts.md': 'CHARTING/Integrated/Range Charts.md',
  'charting/chart-menu.md': 'CHARTING/Integrated/Chart Menu.md',
  'charting/chart-tool-panel.md': 'CHARTING/Integrated/Chart Tool Pannel.md',
  'charting/chart-events.md': 'CHARTING/Integrated/Chart Events.md',
  'charting/saving-charts.md': 'CHARTING/Integrated/Saving Charts.md',
  'sparklines/overview.md': 'CHARTING/Sparklines/Overview.md',
  'sparklines/installation.md': 'CHARTING/Sparklines/Installation.md',
  'more-photon-features/key-features.md': 'GETTING STARTED/Key Features.md',
  'more-photon-features/quick-start.md': 'GETTING STARTED/Quick Start.md',
  'more-photon-features/creating-a-basic-grid.md': 'GETTING STARTED/Tutorials/Creating a Basic Grid.md',
  'more-photon-features/styling-a-grid.md': 'GETTING STARTED/Tutorials/Styling a Grid.md',
  'more-photon-features/columns-overview.md': 'CORE FEATURES/Columns/Overview.md',
  'more-photon-features/columns-definition.md': 'CORE FEATURES/Columns/Columns Definition.md',
  'more-photon-features/calculated-columns.md': 'CORE FEATURES/Columns/Calculated Columns.md',
  'more-photon-features/auto-generate-columns.md': 'CORE FEATURES/Columns/Auto Generate Columns.md',
  'more-photon-features/columns-state.md': 'CORE FEATURES/Columns/Columns State.md',
  'more-photon-features/rows-overview.md': 'CORE FEATURES/Rows/Overview.md',
  'more-photon-features/row-actions.md': 'CORE FEATURES/Rows/Row Actions.md',
  'more-photon-features/row-checkboxes.md': 'CORE FEATURES/Rows/Row Checkboxes.md',
  'more-photon-features/row-grouping.md': 'CORE FEATURES/Rows/Grouping.md',
  'more-photon-features/theming-overview.md': 'LAYOOUT AND THEMING/Theming/Overview.md',
  'more-photon-features/borders.md': 'LAYOOUT AND THEMING/Theming/Borders.md',
  'more-photon-features/fonts.md': 'LAYOOUT AND THEMING/Theming/Fonts.md',
  'more-photon-features/headers.md': 'LAYOOUT AND THEMING/Theming/Headers.md',
  'more-photon-features/icons.md': 'LAYOOUT AND THEMING/Theming/Icons.md',
  'more-photon-features/selections.md': 'LAYOOUT AND THEMING/Theming/Selections.md',
};

// original docs-relative path -> new site route (/docs/<route>)
const origToRoute = {
  // preserved
  'CHARTING/Integrated/Overview.md': 'charting/overview',
  'CHARTING/Integrated/Installation.md': 'charting/installation',
  'CHARTING/Integrated/Chart Types.md': 'charting/chart-types',
  'CHARTING/Integrated/Range Charts.md': 'charting/range-charts',
  'CHARTING/Integrated/Chart Menu.md': 'charting/chart-menu',
  'CHARTING/Integrated/Chart Tool Pannel.md': 'charting/chart-tool-panel',
  'CHARTING/Integrated/Chart Events.md': 'charting/chart-events',
  'CHARTING/Integrated/Saving Charts.md': 'charting/saving-charts',
  'CHARTING/Sparklines/Overview.md': 'sparklines/overview',
  'CHARTING/Sparklines/Installation.md': 'sparklines/installation',
  'GETTING STARTED/Key Features.md': 'more-photon-features/key-features',
  'GETTING STARTED/Quick Start.md': 'more-photon-features/quick-start',
  'GETTING STARTED/Tutorials/Creating a Basic Grid.md': 'more-photon-features/creating-a-basic-grid',
  'GETTING STARTED/Tutorials/Styling a Grid.md': 'more-photon-features/styling-a-grid',
  'CORE FEATURES/Columns/Overview.md': 'more-photon-features/columns-overview',
  'CORE FEATURES/Columns/Columns Definition.md': 'more-photon-features/columns-definition',
  'CORE FEATURES/Columns/Calculated Columns.md': 'more-photon-features/calculated-columns',
  'CORE FEATURES/Columns/Auto Generate Columns.md': 'more-photon-features/auto-generate-columns',
  'CORE FEATURES/Columns/Columns State.md': 'more-photon-features/columns-state',
  'CORE FEATURES/Rows/Overview.md': 'more-photon-features/rows-overview',
  'CORE FEATURES/Rows/Row Actions.md': 'more-photon-features/row-actions',
  'CORE FEATURES/Rows/Row Checkboxes.md': 'more-photon-features/row-checkboxes',
  'CORE FEATURES/Rows/Grouping.md': 'more-photon-features/row-grouping',
  'LAYOOUT AND THEMING/Theming/Overview.md': 'more-photon-features/theming-overview',
  'LAYOOUT AND THEMING/Theming/Borders.md': 'more-photon-features/borders',
  'LAYOOUT AND THEMING/Theming/Fonts.md': 'more-photon-features/fonts',
  'LAYOOUT AND THEMING/Theming/Headers.md': 'more-photon-features/headers',
  'LAYOOUT AND THEMING/Theming/Icons.md': 'more-photon-features/icons',
  'LAYOOUT AND THEMING/Theming/Selections.md': 'more-photon-features/selections',
  // non-preserved originals -> HOT placeholder routes
  'GETTING STARTED/Setup/Installation.md': 'getting-started/installation',
  'GETTING STARTED/Setup/Registering Modules.md': 'tools-and-building/modules',
  'GETTING STARTED/Tutorials/Testing.md': 'tools-and-building/testing',
  'CORE FEATURES/Columns/Columns Resizing.md': 'columns/column-widths',
  'CORE FEATURES/Columns/Autosize Columns.md': 'columns/column-widths',
  'CORE FEATURES/Columns/Columns Pinning.md': 'columns/column-freezing',
  'CORE FEATURES/Columns/Columns Moving.md': 'columns/column-moving',
  'CORE FEATURES/Columns/Columns Groups.md': 'columns/column-groups',
  'CORE FEATURES/Columns/Columns Chosing.md': 'columns/column-hiding',
  'CORE FEATURES/Rows/Sorting.md': 'rows/rows-sorting',
  'CORE FEATURES/Rows/Row Numbers.md': 'rows/row-headers',
  'CORE FEATURES/Rows/Row Height.md': 'rows/row-heights',
  'CORE FEATURES/Rows/Row Dragging.md': 'rows/row-moving',
  'LAYOOUT AND THEMING/Theming/Built in Themes.md': 'styling/themes',
};

function normalize(p) {
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return out.join('/');
}

const linkRe = /\]\((\.\.?\/[^)]+?\.md)(#[^)]*)?\)/g;
const unresolved = [];
let rewrites = 0;

for (const [newRel, origRel] of Object.entries(newToOrig)) {
  const abs = path.join(DOCS, newRel);
  let text = fs.readFileSync(abs, 'utf8');
  const origDir = origRel.split('/').slice(0, -1).join('/');
  text = text.replace(linkRe, (m, target, anchor) => {
    const decoded = decodeURIComponent(target);
    const resolved = normalize(origDir + '/' + decoded);
    const route = origToRoute[resolved];
    if (!route) {
      unresolved.push(`${newRel}: ${target} (resolved ${resolved})`);
      return m;
    }
    rewrites++;
    return `](/docs/${route}${anchor || ''})`;
  });
  fs.writeFileSync(abs, text, 'utf8');
}

console.log('Rewrites:', rewrites);
if (unresolved.length) {
  console.log('UNRESOLVED:');
  for (const u of unresolved) console.log('  ' + u);
} else {
  console.log('All relative .md links resolved.');
}
