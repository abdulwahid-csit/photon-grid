import { lazy, Suspense, useState } from 'react';

import './App.css';

/**
 * Photon Grid — React example.
 *
 * Ports every demo from the Angular example. Each one is code-split and mounted
 * on demand: the grids here range from a 100 000-row client-side dataset to a
 * million-row infinite feed, and mounting them all at once would measure the
 * page rather than the grid.
 */

const DEMOS = [
  {
    id: 'realtime',
    label: 'Real-Time',
    blurb: 'Viewport Virtual DOM patched cell-by-cell by a simulated market feed.',
    Component: lazy(() => import('./demos/RealtimeGrid')),
  },
  {
    id: 'master-detail',
    label: 'Master / Detail',
    blurb: 'Rows expanding into a nested grid or a React component, lazily fetched.',
    Component: lazy(() => import('./demos/MasterDetailGrid')),
  },
  {
    id: 'infinite',
    label: 'Infinite',
    blurb: 'A million rows behind a mock backend, LRU-cached and skeleton-filled.',
    Component: lazy(() => import('./demos/InfiniteGrid')),
  },
  {
    id: 'basic',
    label: 'Basic',
    blurb: '100 000 client-side rows, component + function cell renderers, toolbar.',
    Component: lazy(() => import('./demos/BasicGrid')),
  },
  {
    id: 'formula',
    label: 'Formula',
    blurb: 'Excel-style formulas with a live dependency graph.',
    Component: lazy(() => import('./demos/FormulaGrid')),
  },
  {
    id: 'server-side',
    label: 'Server-Side & AI Theme',
    blurb: 'Sorting, filtering and paging delegated to a datasource; AI theming.',
    Component: lazy(() => import('./demos/ServerSideGrid')),
  },
  {
    id: 'nested-columns',
    label: 'Grouped Headers',
    blurb: 'Multi-row header built from nested column definitions.',
    Component: lazy(() => import('./demos/NestedColumnsGrid')),
  },
];

export function App() {
  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const active = DEMOS.find((demo) => demo.id === activeId) ?? DEMOS[0];
  const ActiveDemo = active.Component;

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Photon Grid — React example</h1>
        <p className="page__subtitle">{active.blurb}</p>
      </header>

      <nav className="page__nav" aria-label="Demos">
        {DEMOS.map((demo) => (
          <button
            key={demo.id}
            type="button"
            className={`page__nav-item${demo.id === activeId ? ' page__nav-item--on' : ''}`}
            aria-current={demo.id === activeId ? 'page' : undefined}
            onClick={() => setActiveId(demo.id)}
          >
            {demo.label}
          </button>
        ))}
      </nav>

      {/* Keyed on the demo id so switching unmounts the previous grid outright —
          each demo owns timers, datasources and an event-bus subscription that
          must be torn down, not reused. */}
      <Suspense fallback={<p className="page__loading">Loading demo…</p>}>
        <ActiveDemo key={active.id} />
      </Suspense>
    </main>
  );
}

export default App;
