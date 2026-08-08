import type { ThemeVariant } from './theme.types';

/**
 * A set of icons, keyed by the registry name the grid resolves them under.
 *
 * Values are raw SVG markup. Authoring rules, which the renderer depends on:
 *
 * - The root `<svg>` must carry a `viewBox` and **no** `width`, `height` or
 *   `style` attribute. `IconRenderer.renderToString` injects all three, and the
 *   HTML parser keeps the *first* occurrence of a duplicate attribute — so any
 *   the source carries would silently shadow the size the grid asked for.
 * - All paint must be `currentColor`. Themes tint icons through CSS
 *   (`.pg-icon { color: … }`); a hardcoded fill cannot follow the theme, and in
 *   dark mode it usually disappears.
 *
 * A set is always *partial*: names it omits resolve through to the shared
 * {@link coreIcons}, so a variant pack only has to draw the glyphs that carry
 * its identity.
 */
export type IconSet = Readonly<Record<string, string>>;

/**
 * Per-variant icon packs. Each entry is merged over the built-in pack for that
 * variant, which is itself layered over {@link coreIcons}.
 */
export type VariantIconSets = Partial<Readonly<Record<ThemeVariant, IconSet>>>;
