import type { ThemeVariant } from '../../types/theme.types';
import type { IconSet } from '../../types/icon.types';
import { classicIcons } from './classic-icons';
import { ionIcons } from './ion-icons';
import { neonIcons } from './neon-icons';
import { photonIcons } from './photon-icons';
import { quantumIcons } from './quantum-icons';

/**
 * The built-in icon pack for each theme variant.
 *
 * Each pack covers only the glyphs that carry its theme's identity — stroke
 * weight, corner treatment and fill style are what make Ion, Neon, Photon and
 * Quantum read as different products. Every other name resolves through to
 * `coreIcons`, so adding a new icon to the grid does not oblige anyone to draw
 * it four times.
 *
 * Follows the same import-then-collect shape as `styles/base-styles.ts`, so the
 * set of variants is declared in exactly one place per concern.
 */
export const variantIconSets: Readonly<Record<ThemeVariant, IconSet>> = {
  /**
   * Two glyphs only — the sort arrows, which are the one place the default
   * skin's reference point (AG Grid) differs from `coreIcons`. Everything else
   * falls straight through. See `classic-icons.ts`.
   */
  classic: classicIcons,
  ion: ionIcons,
  neon: neonIcons,
  photon: photonIcons,
  quantum: quantumIcons,
};
