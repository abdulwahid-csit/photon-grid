import React, {useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import {PRESETS} from './presets';
import './styles.css';

/**
 * <LiveGrid> — embeds a REAL Photon Grid (the published `photon-grid-core`
 * UMD bundle, loaded from jsDelivr) directly inside a docs page. No iframe:
 * the grid renders inline so it inherits the page width, theme and dark mode.
 *
 * Usage in any .md / .mdx page (registered globally via theme/MDXComponents):
 *   <LiveGrid preset="quickStart" />
 *   <LiveGrid preset="richCells" height={380} />
 *   <LiveGrid columns={[...]} data={[...]} options={{...}} />
 */

const CDN =
  'https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js';

// Load the PhotonGrid UMD bundle once per page and resolve the global.
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
      reject(new Error('Failed to load Photon Grid from the CDN.')),
    );
    if (w.PhotonGrid) resolve(w.PhotonGrid);
  });
}

type LiveGridProps = {
  /** Name of a bundled example in presets.ts */
  preset?: keyof typeof PRESETS;
  /** Or pass grid config directly */
  columns?: any[];
  data?: any[];
  options?: Record<string, unknown>;
  /** Grid viewport height (px or any CSS length). Default 420. */
  height?: number | string;
  /** Optional caption shown under the grid. */
  title?: string;
};

function resolveConfig(props: LiveGridProps) {
  if (props.preset && PRESETS[props.preset]) {
    const built = PRESETS[props.preset]();
    return {
      columns: props.columns ?? built.columns,
      data: props.data ?? built.data,
      options: props.options ?? built.options ?? {},
    };
  }
  return {
    columns: props.columns ?? [],
    data: props.data ?? [],
    options: props.options ?? {},
  };
}

function LiveGridInner(props: LiveGridProps): React.ReactElement {
  const elRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading Photon Grid…');

  // Follow the Docusaurus light/dark theme. When the docs are in dark mode the
  // grid renders in dark mode, and vice-versa — unless the caller pins a mode
  // explicitly via `options.mode`.
  const {colorMode} = useColorMode();
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  const height =
    typeof props.height === 'number' ? `${props.height}px` : props.height ?? '420px';

  // Serialise the resolved config so the effect re-runs when it changes.
  const cfg = resolveConfig(props);
  // A caller-pinned mode wins over the docs theme; otherwise we track it.
  const pinnedMode = (cfg.options as any)?.mode as string | undefined;
  const cfgKey = JSON.stringify({
    p: props.preset,
    c: cfg.columns?.length,
    d: cfg.data?.length,
    o: cfg.options,
  });

  useEffect(() => {
    let live = true;

    loadPhoton()
      .then((PG) => {
        if (!live || !elRef.current) return;
        if (!PG || !PG.GridCore) {
          setStatus('error');
          setMessage('Photon Grid loaded but GridCore was not found.');
          return;
        }

        // Tear down any previous instance before rebuilding.
        if (gridRef.current && typeof gridRef.current.destroy === 'function') {
          gridRef.current.destroy();
        }
        elRef.current.innerHTML = '';

        const options = Object.assign(
          {headerRowHeight: 48, rowHeight: 42},
          cfg.options || {},
          {
            columns: cfg.columns,
            data: cfg.data,
            // Seed the grid with the current docs theme (unless pinned).
            mode: pinnedMode ?? colorModeRef.current,
          },
        );

        gridRef.current = new PG.GridCore(elRef.current, options);
        setStatus('ready');
      })
      .catch((e) => {
        if (!live) return;
        setStatus('error');
        setMessage(e?.message || 'Failed to load Photon Grid.');
      });

    return () => {
      live = false;
      if (gridRef.current && typeof gridRef.current.destroy === 'function') {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgKey]);

  // Live-sync the grid's color mode when the docs theme is toggled — no rebuild.
  useEffect(() => {
    if (pinnedMode) return; // caller pinned a mode: leave it alone
    const grid = gridRef.current;
    if (grid && grid.api && typeof grid.api.setMode === 'function') {
      grid.api.setMode(colorMode);
    }
  }, [colorMode, status, pinnedMode]);

  return (
    <figure className="livegrid">
      <div className="livegrid__frame" style={{height}}>
        {status !== 'ready' && (
          <div
            className={`livegrid__overlay${
              status === 'error' ? ' livegrid__overlay--error' : ''
            }`}>
            {message}
          </div>
        )}
        <div ref={elRef} className="livegrid__mount" />
      </div>
      {props.title && <figcaption className="livegrid__cap">{props.title}</figcaption>}
    </figure>
  );
}

export default function LiveGrid(props: LiveGridProps): React.ReactElement {
  const height =
    typeof props.height === 'number' ? `${props.height}px` : props.height ?? '420px';
  return (
    <BrowserOnly
      fallback={
        <div className="livegrid">
          <div className="livegrid__frame" style={{height}}>
            <div className="livegrid__overlay">Loading Photon Grid…</div>
          </div>
        </div>
      }>
      {() => <LiveGridInner {...props} />}
    </BrowserOnly>
  );
}
