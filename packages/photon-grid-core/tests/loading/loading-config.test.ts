import { describe, it, expect } from 'vitest';

import {
  LoadingBackdrop,
  LoadingIndicator,
  resolveLoadingOverlayConfig,
} from '../../src/types/loading.types';

/**
 * `resolveLoadingOverlayConfig` is the single place the loading overlay's
 * defaults live, and the single place the deprecated
 * `GridOptions.loadingOverlayText` folds into the newer `loadingOverlay.text`.
 * Both are contracts the renderer reads on the hot path without re-checking, so
 * they are pinned here rather than inferred from DOM assertions.
 */
describe('resolveLoadingOverlayConfig — defaults', () => {
  it('fills every field from an absent config', () => {
    expect(resolveLoadingOverlayConfig()).toEqual({
      indicator: LoadingIndicator.Spinner,
      text: 'Loading…',
      showText: true,
      icon: 'loading',
      iconSize: 32,
      backdrop: LoadingBackdrop.Translucent,
      skeletonRows: 0,
      delay: 0,
      className: '',
    });
  });

  it('defaults the indicator to the spinner', () => {
    expect(resolveLoadingOverlayConfig({}).indicator).toBe(LoadingIndicator.Spinner);
  });

  it('treats an omitted showText as true but honours an explicit false', () => {
    expect(resolveLoadingOverlayConfig({}).showText).toBe(true);
    expect(resolveLoadingOverlayConfig({ showText: false }).showText).toBe(false);
  });
});

describe('resolveLoadingOverlayConfig — backdrop inference', () => {
  it('defaults the spinner to a translucent backdrop', () => {
    const resolved = resolveLoadingOverlayConfig({ indicator: LoadingIndicator.Spinner });
    expect(resolved.backdrop).toBe(LoadingBackdrop.Translucent);
  });

  it('defaults the skeleton to an opaque backdrop', () => {
    // Placeholders over stale rows read as corruption, so the skeleton flips
    // what "unspecified" means rather than forcing every host to say so.
    const resolved = resolveLoadingOverlayConfig({ indicator: LoadingIndicator.Skeleton });
    expect(resolved.backdrop).toBe(LoadingBackdrop.Opaque);
  });

  it('lets an explicit backdrop win over both inferences', () => {
    expect(
      resolveLoadingOverlayConfig({
        indicator: LoadingIndicator.Skeleton,
        backdrop: LoadingBackdrop.None,
      }).backdrop,
    ).toBe(LoadingBackdrop.None);

    expect(
      resolveLoadingOverlayConfig({
        indicator: LoadingIndicator.Spinner,
        backdrop: LoadingBackdrop.Opaque,
      }).backdrop,
    ).toBe(LoadingBackdrop.Opaque);
  });
});

describe('resolveLoadingOverlayConfig — loadingOverlayText back-compat', () => {
  it('uses the deprecated option when no text is configured', () => {
    expect(resolveLoadingOverlayConfig(undefined, 'Fetching…').text).toBe('Fetching…');
    expect(resolveLoadingOverlayConfig({}, 'Fetching…').text).toBe('Fetching…');
  });

  it('lets the newer option win over the deprecated one', () => {
    expect(resolveLoadingOverlayConfig({ text: 'Newer' }, 'Older').text).toBe('Newer');
  });

  it('falls back to the built-in caption when neither is supplied', () => {
    expect(resolveLoadingOverlayConfig({}, undefined).text).toBe('Loading…');
  });
});

describe('resolveLoadingOverlayConfig — numeric guards', () => {
  it('rejects a non-positive icon size, which would render an invisible spinner', () => {
    expect(resolveLoadingOverlayConfig({ iconSize: 0 }).iconSize).toBe(32);
    expect(resolveLoadingOverlayConfig({ iconSize: -8 }).iconSize).toBe(32);
    expect(resolveLoadingOverlayConfig({ iconSize: 48 }).iconSize).toBe(48);
  });

  it('normalizes skeletonRows to a non-negative integer, 0 meaning auto', () => {
    expect(resolveLoadingOverlayConfig({ skeletonRows: 0 }).skeletonRows).toBe(0);
    expect(resolveLoadingOverlayConfig({ skeletonRows: -2 }).skeletonRows).toBe(0);
    expect(resolveLoadingOverlayConfig({ skeletonRows: 4.7 }).skeletonRows).toBe(4);
    expect(resolveLoadingOverlayConfig({ skeletonRows: 6 }).skeletonRows).toBe(6);
  });

  it('clamps a negative delay to zero (paint immediately)', () => {
    expect(resolveLoadingOverlayConfig({ delay: -1 }).delay).toBe(0);
    expect(resolveLoadingOverlayConfig({ delay: 150 }).delay).toBe(150);
  });
});
