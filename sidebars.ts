import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Manual sidebar that mirrors the Handsontable `javascript-data-grid` docs
 * sidebar 1:1 — same categories, same order, same labels. Pages Photon Grid
 * does not document yet are "functionality pending" placeholders. Photon-only
 * areas (Charting, Sparklines, and other unique pages) are appended after the
 * mirrored structure so no existing content is lost.
 *
 * The key stays `tutorialSidebar` because the navbar's `docSidebar` item
 * (docusaurus.config.ts) references that id.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/demo',
        'getting-started/installation',
        'getting-started/configuration-options',
        'getting-started/grid-size',
        'getting-started/custom-id-class-style',
        'getting-started/license-key',
      ],
    },
    {
      type: 'category',
      label: 'AI Tools',
      collapsed: true,
      items: [
        'ai-tools/photon-ai',
        'ai-tools/skills-for-claude-code',
        'ai-tools/ai-theme-builder',
        'ai-tools/ai-docs-assistant',
      ],
    },
    {
      type: 'category',
      label: 'Styling',
      collapsed: true,
      items: [
        'styling/themes',
        'styling/design-system',
        'styling/theme-customization',
        'styling/legacy-style',
      ],
    },
    {
      type: 'category',
      label: 'Columns',
      collapsed: true,
      items: [
        'columns/column-definitions',
        'columns/column-types',
        'columns/column-headers',
        'columns/column-groups',
        'columns/column-hiding',
        'columns/column-moving',
        'columns/column-freezing',
        'columns/column-widths',
        'columns/column-summary',
        'columns/column-virtualization',
        'columns/column-menu',
        'columns/column-filter',
      ],
    },
    {
      type: 'category',
      label: 'Rows',
      collapsed: true,
      items: [
        'rows/row-headers',
        'rows/row-parent-child',
        'rows/row-hiding',
        'rows/row-moving',
        'rows/row-freezing',
        'rows/row-heights',
        'rows/row-virtualization',
        'rows/rows-sorting',
        'rows/rows-pagination',
        'rows/row-trimming',
        'rows/row-pre-populating',
      ],
    },
    {
      type: 'category',
      label: 'Cell features',
      collapsed: true,
      items: [
        'cell-features/selection',
        'cell-features/merge-cells',
        'cell-features/conditional-formatting',
        'cell-features/text-alignment',
        'cell-features/disabled-cells',
        'cell-features/comments',
        'cell-features/autofill-values',
        'cell-features/formatting-cells',
      ],
    },
    {
      type: 'category',
      label: 'Cell functions',
      collapsed: true,
      items: [
        'cell-functions/cell-functions',
        'cell-functions/cell-renderer',
        'cell-functions/cell-editor',
        'cell-functions/cell-validator',
        'cell-functions/custom-cells',
      ],
    },
    {
      type: 'category',
      label: 'Cell types',
      collapsed: true,
      items: [
        'cell-types/cell-type',
        'cell-types/numeric-cell-type',
        'cell-types/date-cell-type',
        'cell-types/time-cell-type',
        'cell-types/checkbox-cell-type',
        'cell-types/select-cell-type',
        'cell-types/dropdown-cell-type',
        'cell-types/autocomplete-cell-type',
        'cell-types/multiselect-cell-type',
        'cell-types/password-cell-type',
        'cell-types/handsontable-cell-type',
      ],
    },
    {
      type: 'category',
      label: 'Formulas',
      collapsed: true,
      items: ['formulas/formula-calculation'],
    },
    {
      type: 'category',
      label: 'Server-side data',
      collapsed: true,
      items: [
        'server-side-data/server-side-data',
        'server-side-data/migrate-to-server-side-data',
        'server-side-data/server-side-configuration',
        'server-side-data/server-side-crud',
        'server-side-data/server-side-fetching-and-examples',
      ],
    },
    {
      type: 'category',
      label: 'Data management',
      collapsed: true,
      items: [
        'data-management/binding-to-data',
        'data-management/saving-data',
        'data-management/events-and-hooks',
        'data-management/export-to-excel',
        'data-management/export-to-csv',
        'data-management/clipboard',
      ],
    },
    {
      type: 'category',
      label: 'Accessories and menus',
      collapsed: true,
      items: [
        'accessories-and-menus/context-menu',
        'accessories-and-menus/drag-to-scroll',
        'accessories-and-menus/undo-and-redo',
        'accessories-and-menus/icon-pack',
        'accessories-and-menus/empty-data-state',
        'accessories-and-menus/dialog',
        'accessories-and-menus/loading',
        'accessories-and-menus/notification',
        'accessories-and-menus/layout-slots',
      ],
    },
    {
      type: 'category',
      label: 'Internationalization',
      collapsed: true,
      items: [
        'internationalization/language',
        'internationalization/locale',
        'internationalization/layout-direction',
        'internationalization/ime-support',
      ],
    },
    {
      type: 'category',
      label: 'Accessibility and navigation',
      collapsed: true,
      items: [
        'accessibility-and-navigation/keyboard-shortcuts',
        'accessibility-and-navigation/custom-shortcuts',
        'accessibility-and-navigation/focus-scopes',
        'accessibility-and-navigation/searching-values',
        'accessibility-and-navigation/accessibility',
        'accessibility-and-navigation/accessibility-conformance-report',
      ],
    },
    {
      type: 'category',
      label: 'Tools and building',
      collapsed: true,
      items: [
        'tools-and-building/packages',
        'tools-and-building/modules',
        'tools-and-building/typescript-types',
        'tools-and-building/custom-plugins',
        'tools-and-building/custom-builds',
        'tools-and-building/testing',
      ],
    },
    {
      type: 'category',
      label: 'Optimization',
      collapsed: true,
      items: [
        'optimization/batch-operations',
        'optimization/performance',
        'optimization/bundle-size',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      collapsed: true,
      items: ['security/security'],
    },
    {
      type: 'category',
      label: 'Technical specification',
      collapsed: true,
      items: [
        'technical-specification/supported-browsers',
        'technical-specification/software-license',
        'technical-specification/third-party-licenses',
        'technical-specification/documentation-license',
      ],
    },

    // ─── Photon Grid-only extras (preserved real content) ───
    {
      type: 'category',
      label: 'Charting',
      collapsed: true,
      items: [
        'charting/overview',
        'charting/installation',
        'charting/chart-types',
        'charting/range-charts',
        'charting/chart-menu',
        'charting/chart-tool-panel',
        'charting/chart-events',
        'charting/saving-charts',
      ],
    },
    {
      type: 'category',
      label: 'Sparklines',
      collapsed: true,
      items: ['sparklines/overview', 'sparklines/installation'],
    },
    {
      type: 'category',
      label: 'More Photon features',
      collapsed: true,
      items: [
        'more-photon-features/key-features',
        'more-photon-features/quick-start',
        'more-photon-features/creating-a-basic-grid',
        'more-photon-features/styling-a-grid',
        'more-photon-features/columns-overview',
        'more-photon-features/columns-definition',
        'more-photon-features/calculated-columns',
        'more-photon-features/auto-generate-columns',
        'more-photon-features/columns-state',
        'more-photon-features/rows-overview',
        'more-photon-features/row-actions',
        'more-photon-features/row-checkboxes',
        'more-photon-features/row-grouping',
        'more-photon-features/theming-overview',
        'more-photon-features/borders',
        'more-photon-features/fonts',
        'more-photon-features/headers',
        'more-photon-features/icons',
        'more-photon-features/selections',
      ],
    },
  ],
};

export default sidebars;
