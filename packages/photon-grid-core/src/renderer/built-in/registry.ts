import type {
  BuiltInRendererDefinition,
} from '../../types/built-in-renderer.types';
import { avatarGroupRenderer } from './avatar-group';
import { actionsRenderer } from './actions/actions';
import { booleanRenderer, checkboxRenderer, switchRenderer } from './boolean';
import { countryRenderer } from './country/country';
import { iconRenderer, progressRenderer, ratingRenderer } from './indicator';
import { emailRenderer, linkRenderer, phoneRenderer } from './link';
import { avatarRenderer, imageRenderer } from './media';
import { buttonRenderer, htmlRenderer, jsonRenderer, sparklineRenderer } from './misc';
import { currencyRenderer, numberRenderer, percentageRenderer } from './numeric';
import { badgeRenderer, chipRenderer, listRenderer, tagRenderer } from './pill';
import { longTextRenderer } from './long-text';
import { profileRenderer } from './profile';
import { dateRenderer, datetimeRenderer, durationRenderer, timeRenderer } from './temporal';
import { multilineRenderer, textRenderer } from './text';

/**
 * Lookup table of cell renderer implementations, keyed by name.
 *
 * Built-in renderers register themselves through exactly the same call a
 * user-defined one would, so there is no special-casing between the two: adding
 * `registry.register({ name: 'sla-badge', textOnly: false, render })` produces a
 * renderer a column can select with `renderer: 'sla-badge'`, indistinguishable
 * from `'currency'` at every downstream point.
 *
 * ### Registration is open at any time
 * `register()` is callable before or after the grid has rendered. Registering a
 * name a column already selects takes effect on that column's next render — the
 * hook a lazily-loaded renderer bundle would use.
 *
 * ### On tree-shaking
 * The default set arrives through {@link createDefaultRenderers}, a function
 * rather than a module-scope constant, so a consumer who builds their own
 * registry never references it. Be aware, though, that {@link cellRenderers} —
 * the instance the grid itself renders through — *is* constructed eagerly with
 * the full set, and `renderer-resolver.ts` imports it. Any bundle containing
 * the grid therefore contains all 33 today. The seam is real for a custom
 * embedding; it is not a saving the default build gets for free.
 *
 * Follows the shape of `IconRegistry` and `AutoFillDetectorRegistry`; method
 * names match `IconRegistry` (`remove`, not `unregister`).
 */
export class BuiltInRendererRegistry {
  private readonly renderers = new Map<string, BuiltInRendererDefinition>();

  /**
   * @param definitions - Renderers to seed the registry with. Defaults to every
   *   renderer Photon Grid ships; pass your own array to opt out of the rest.
   */
  constructor(definitions: readonly BuiltInRendererDefinition[] = createDefaultRenderers()) {
    this.registerAll(definitions);
  }

  /**
   * Adds a renderer, replacing any existing one with the same name.
   *
   * Last-in wins, deliberately: it is what lets an application override a
   * built-in (a house style for `badge`, say) without the grid needing an
   * override mechanism of its own.
   */
  register(definition: BuiltInRendererDefinition): void {
    this.renderers.set(definition.name, definition);
  }

  /** Registers several renderers, in order — later duplicates win. */
  registerAll(definitions: readonly BuiltInRendererDefinition[]): void {
    for (const definition of definitions) this.register(definition);
  }

  /** The renderer registered under `name`, or `undefined`. */
  get(name: string): BuiltInRendererDefinition | undefined {
    return this.renderers.get(name);
  }

  has(name: string): boolean {
    return this.renderers.has(name);
  }

  /** A copy of the registry, so callers cannot mutate it by holding the map. */
  getAll(): Map<string, BuiltInRendererDefinition> {
    return new Map(this.renderers);
  }

  /** Registered names, in registration order. */
  names(): string[] {
    return [...this.renderers.keys()];
  }

  /** Removes a renderer. Columns selecting it fall back to their inferred default. */
  remove(name: string): void {
    this.renderers.delete(name);
  }

  clear(): void {
    this.renderers.clear();
  }
}

/**
 * Every renderer Photon Grid ships with.
 *
 * A plain function rather than a module-scope constant so a consumer building
 * their own registry does not reference it — see the class's tree-shaking note
 * for the honest limits of that.
 */
export function createDefaultRenderers(): BuiltInRendererDefinition[] {
  return [
    textRenderer,
    multilineRenderer,
    longTextRenderer,
    numberRenderer,
    currencyRenderer,
    percentageRenderer,
    booleanRenderer,
    checkboxRenderer,
    switchRenderer,
    dateRenderer,
    datetimeRenderer,
    timeRenderer,
    durationRenderer,
    linkRenderer,
    emailRenderer,
    phoneRenderer,
    imageRenderer,
    avatarRenderer,
    avatarGroupRenderer,
    profileRenderer,
    countryRenderer,
    badgeRenderer,
    chipRenderer,
    tagRenderer,
    listRenderer,
    iconRenderer,
    progressRenderer,
    ratingRenderer,
    sparklineRenderer,
    jsonRenderer,
    buttonRenderer,
    actionsRenderer,
    htmlRenderer,
  ] as BuiltInRendererDefinition[];
}

/**
 * The registry the grid renders through.
 *
 * A shared instance because renderer identity is global — two grids on a page
 * showing the same `renderer: 'country'` column must draw it the same way, and
 * an application registering a custom renderer expects it to apply everywhere.
 */
export const cellRenderers = new BuiltInRendererRegistry();
