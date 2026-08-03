import type { ThemeVariant } from '../types/theme.types';
import type { IconSet, VariantIconSets } from '../types/icon.types';
import type { IconRegistry } from './icon-registry';
import type { IconRenderer } from './icon-renderer';
import { iconRepaintRoots, repaintIcons } from './icon-repainter';
import { variantIconSets } from './icon-sets/variant-icon-sets';

/**
 * Keeps the icon registry in step with the active theme variant.
 *
 * The theme layer knows nothing about icons — `ThemeManager` calls an injected
 * handler on every variant change, and this class is what that handler drives.
 * Keeping the two apart means theming stays a pure CSS concern and the icon
 * layer stays independently testable.
 *
 * Internal: hosts reach this through `GridApi`, never directly. Building a
 * second controller over the same registry would let two owners fight over the
 * variant layer.
 */
export class IconThemeController {
  private readonly packs: Record<ThemeVariant, IconSet>;
  /** Tracks the applied variant so a pack edit knows whether to repaint. */
  private active: ThemeVariant | 'none' = 'none';

  constructor(
    private readonly registry: IconRegistry,
    private readonly renderer: IconRenderer,
    private readonly containerEl: HTMLElement,
    hostPacks?: VariantIconSets,
  ) {
    this.packs = mergeVariantPacks(hostPacks);
  }

  /**
   * Applies a variant's icon pack and repaints what is already on screen.
   *
   * Safe to call before the first render: the sweep simply matches nothing, and
   * the pack is already in place by the time the grid draws — so the initial
   * variant costs no repaint at all.
   */
  onVariant(variant: ThemeVariant | 'none'): void {
    this.active = variant;
    this.registry.setVariantIcons(variant === 'none' ? null : this.packs[variant] ?? null);
    this.repaint();
  }

  /**
   * Replaces one variant's pack at runtime. Repaints only when that variant is
   * the one currently applied — editing an inactive pack changes nothing on
   * screen until it is selected.
   */
  setVariantIcons(variant: ThemeVariant, icons: IconSet | null): void {
    this.packs[variant] = icons ?? {};
    if (this.active === variant) this.onVariant(variant);
  }

  /** Re-renders every registry-drawn icon in the grid and its portaled overlays. */
  repaint(): number {
    return repaintIcons(this.renderer, iconRepaintRoots(this.containerEl));
  }
}

/** Merges host-supplied packs over the built-ins, per variant. */
function mergeVariantPacks(hostPacks?: VariantIconSets): Record<ThemeVariant, IconSet> {
  const merged = {} as Record<ThemeVariant, IconSet>;
  for (const key of Object.keys(variantIconSets) as ThemeVariant[]) {
    const host = hostPacks?.[key];
    merged[key] = host ? { ...variantIconSets[key], ...host } : variantIconSets[key];
  }
  return merged;
}
