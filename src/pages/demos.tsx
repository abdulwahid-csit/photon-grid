import React, {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

import {DEMOS as DEMOS_RAW} from '@site/src/components/GridDemos/data';
import '@site/src/components/GridDemos/styles.css';

type BuiltGrid = {columns: any[]; data: any[]; options?: Record<string, unknown>};
type Demo = {
  id: string;
  title: string;
  glyph: string;
  desc: string;
  c1: string;
  c2: string;
  rows: number;
  cols: number;
  build: () => BuiltGrid; 
};

const DEMOS = DEMOS_RAW as unknown as Demo[];

const CDN = 'https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js';

// Load the PhotonGrid UMD bundle once and resolve the global.
function loadPhoton(): Promise<any> {
  const w = window as any;
  if (w.PhotonGrid) return Promise.resolve(w.PhotonGrid);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>('script[data-photon-grid]');
    if (!s) {
      s = document.createElement('script');
      s.src = CDN;
      s.async = true;
      s.setAttribute('data-photon-grid', 'true');
      document.head.appendChild(s);
    }
    s.addEventListener('load', () => resolve(w.PhotonGrid));
    s.addEventListener('error', () =>
      reject(new Error('Failed to load Photon Grid from CDN')),
    );
    if (w.PhotonGrid) resolve(w.PhotonGrid);
  });
}

function intBetween(rng: any, a: any, b: any) { return Math.floor(between(rng, a, b + 1)); }
function between(rng: any, a: any, b: any) { return a + rng() * (b - a); }
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function DemosApp(): React.ReactElement {
  const gridElRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const financeIntervalRef = useRef<number | null>(null);


  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({rows: 0, cols: 0});

  const active = DEMOS.find((d) => d.id === activeId)!;

  // Load the grid engine on mount.
  useEffect(() => {
    let live = true;
    loadPhoton()
      .then(() => live && setReady(true))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  // (Re)build the grid whenever the active demo changes.
  useEffect(() => {
    if (financeIntervalRef.current) {
  clearInterval(financeIntervalRef.current);
  financeIntervalRef.current = null;
}
    if (!ready || !gridElRef.current) return;
    const PG = (window as any).PhotonGrid;
    if (!PG) return;

    const built = active.build();
    if (gridRef.current && typeof gridRef.current.destroy === 'function') {
      gridRef.current.destroy();
    }
    gridElRef.current.innerHTML = '';

    const options = Object.assign(
      {
        pagination: {enabled: true, pageSize: 100000},
      },
      built.options || {},
      {columns: built.columns, data: built.data},
    );

    gridRef.current = new PG.GridCore(gridElRef.current, options);
    if (active.id === "finance") {
  financeIntervalRef.current = window.setInterval(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    const rows = built.data;
    // var rng = mulberry32(202);

    rows.forEach((row) => {

      // move price a little
      row.price += (Math.random() - 0.5) * 4;

      // recalculate %
      row.change += (Math.random() - 0.5) * 0.35;

      // market cap
      row.marketCap += (Math.random() - 0.5) * 10000000000;

      // volume
      row.volume += Math.floor((Math.random() - 0.5) * 1000000);

      // update sparkline
      row.trend = Array.from({ length: 5 }, function () {
        return Math.floor(Math.random() * 491) + 10; // 10 - 500
      });

      // row.trend.push({
      //   xKey: new Date().toISOString().substring(0,10),
      //   yKey: row.price
      // });

    });

    // api.setData(rows);
    api.applyTransactionAsync(rows);

  }, 300);
}
    setMeta({rows: built.data.length, cols: built.columns.length});
    if (searchRef.current) searchRef.current.value = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeId]);

  // Destroy the grid on unmount (e.g. navigating away).
  useEffect(
    () => () => {
      if (gridRef.current && typeof gridRef.current.destroy === 'function') {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    },
    [],
  );

  const onSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    const g = gridRef.current;
    if (g && g.api && typeof g.api.setQuickFilter === 'function') {
      g.api.setQuickFilter(term);
    }
  }, []);

  return (
    <div className="pg-demos">
      <section className="pg-hero">
        <h1 className="pg-hero__title">{active.title}</h1>
        <p className="pg-hero__desc">{active.desc}</p>
      </section>

      <section className="pg-cards" aria-label="Choose a demo">
        {DEMOS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={clsx('pg-card', d.id === activeId && 'is-active')}
            style={{['--c1' as any]: d.c1, ['--c2' as any]: d.c2}}
            onClick={() => setActiveId(d.id)}>
            <span className="pg-card__thumb">
              <span className="pg-card__glyph">{d.glyph}</span>
            </span>
            <span className="pg-card__body">
              <span className="pg-card__title">{d.title}</span>
              <span className="pg-card__desc">{d.desc}</span>
              <span className="pg-card__meta">
                <span>{d.rows} rows</span>
                <span>{d.cols} cols</span>
              </span>
            </span>
          </button>
        ))}
      </section>

      <section className="pg-panel">
        {/* <div className="pg-toolbar">
          <div className="pg-meta">
            <strong>{meta.rows}</strong> rows
            <span className="pg-dot" />
            <strong>{meta.cols}</strong> columns
            <span className="pg-dot" />
            {active.title}
          </div>
          <div className="pg-toolbar__right">
            <div className="pg-search">
              <span className="pg-search__icon">⌕</span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Filter rows…"
                autoComplete="off"
                onChange={onSearch}
              />
            </div>
          </div>
        </div> */}
        <div className="pg-gridwrap">
          {error ? (
            <div className="pg-demos__loading">{error}</div>
          ) : !ready ? (
            <div className="pg-demos__loading">Loading grid engine…</div>
          ) : null}
          <div ref={gridElRef} className="pg-grid" />
        </div>
      </section>
    </div>
  );
}

export default function DemosPage(): React.ReactElement {
  return (
    <Layout
      title="Live Demos — Photon Grid"
      description="Interactive Photon Grid demos: HR directories, finance watchlists, e-commerce orders and project trackers with custom cell renderers — flags, avatars, badges, ratings and progress bars.">
      <BrowserOnly
        fallback={
          <div className="pg-demos">
            <div className="pg-demos__loading">Loading demos…</div>
          </div>
        }>
        {() => <DemosApp />}
      </BrowserOnly>
    </Layout>
  );
}
