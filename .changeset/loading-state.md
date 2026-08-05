---
'photon-grid-core': minor
'photon-grid-angular': minor
'photon-grid-react': minor
'photon-grid-vue': minor
---

Add a first-class loading state with a configurable indicator.

The grid has always held a `loading` flag internally, but only the Server-Side
and Infinite row models could set it — an app fetching its own data had no way
to say "I'm loading". It is now a public, configurable feature.

**Core**

- `GridOptions.loading` seeds the state at construction, before the first paint,
  so a grid created in a loading state never flashes an empty body.
- `GridOptions.loadingOverlay` shapes the indicator: `LoadingIndicator.Spinner`
  (the default) or `LoadingIndicator.Skeleton`, plus caption, backdrop
  (`translucent` / `opaque` / `none`), spinner icon and size, skeleton row count,
  and an anti-flicker `delay` so a fast request never flashes an indicator.
- New `GridApi` methods: `setLoading()`, `isLoading()`, `showLoadingOverlay()`,
  `hideLoadingOverlay()`, `getLoadingOverlayConfig()`, `updateLoadingOverlay()`.
- Skeleton placeholders align to the live column layout — they mirror the body's
  pinned-panel split and pick their widths up from the same generated stylesheet
  the real cells use, so a column resize or horizontal scroll during loading
  costs no JavaScript and rebuilds no DOM.

**Wrappers**

Angular, React and Vue each gain a dedicated `loading` input/prop plus a
`loadingChanged` / `onLoadingChanged` event. It is deliberately not an `options`
field: all three wrappers recreate the grid when `options` changes identity, and
routing `loading` through `GridApi.setLoading` instead makes a toggle a repaint
rather than a rebuild, preserving scroll position, selection and column layout.
`LoadingIndicator` and `LoadingBackdrop` are re-exported from each package.

**Behaviour changes**

- `GridEventType.LOADING_STARTED` / `LOADING_STOPPED` now carry a
  `LoadingChangedEvent` payload (`{ loading, indicator }`) and are typed in
  `GridEventMap`. They previously emitted an empty object and were undocumented.
  They are now emitted from a single store watcher, so each transition fires
  exactly once regardless of which producer caused it — previously a
  `refreshServerSide()` on an already-loading grid could emit a spurious start.
- `GridOptions.loadingOverlayText` is deprecated in favour of
  `loadingOverlay.text`, and still honoured when the latter is absent.
- Fixed: an import's progress message ("Parsing…", "Mapping…") was destroyed by
  the very next render frame, which the import itself triggered by feeding rows
  in through `setColumns`/`setData`.
