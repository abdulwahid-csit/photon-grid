/**
 * The **Theme Variable Registry** — the single source of truth for every
 * themeable Photon Grid design token. It is derived directly from the base
 * (light) theme, so every entry's {@link ThemeVariable.cssVar} is a real
 * `--pg-*` custom property that actually resolves, and {@link ThemeVariable.defaultValue}
 * is the true default. The AI Theme Engine consults the registry to build
 * prompts and to reject any variable the model invents.
 *
 * Categories and value types are derived by rule from each token's group and
 * key (see {@link resolveCategory}/{@link resolveType}), keeping the registry in
 * lock-step with the token definitions with zero hand-maintained duplication.
 * Applications can {@link ThemeVariableRegistry.register} additional variables.
 *
 * @packageDocumentation
 */

import { lightTheme } from '../../theme/themes/light-theme';
import { toKebab } from '../../theme/css-var-injector';
import { ThemeCategory, ThemeVariableType } from '../../types/theme-ai.types';
import type { ThemeVariable, ThemeVariableRegistryReader } from '../../types/theme-ai.types';

/** Turns a camelCase token key into a human label: `headerBackground` → "Header background". */
function humanize(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/([0-9]+)/g, ' $1');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase().trim();
}

/** Derives the value grammar for a token from its group + key. */
function resolveType(group: string, key: string): ThemeVariableType {
  switch (group) {
    case 'colors':
      return key === 'pinnedShadow' ? ThemeVariableType.Shadow : ThemeVariableType.Color;
    case 'shadows':
      return ThemeVariableType.Shadow;
    case 'spacing':
    case 'sizing':
      return ThemeVariableType.Size;
    case 'borders':
      return key === 'styleBase' ? ThemeVariableType.BorderStyle : ThemeVariableType.Size;
    case 'transitions':
      return key.startsWith('easing') ? ThemeVariableType.Easing : ThemeVariableType.Duration;
    case 'typography':
      if (key.startsWith('fontFamily')) return ThemeVariableType.FontFamily;
      if (key.startsWith('fontSize')) return ThemeVariableType.Size;
      if (key.startsWith('fontWeight')) return ThemeVariableType.FontWeight;
      if (key.startsWith('lineHeight')) return ThemeVariableType.LineHeight;
      if (key.startsWith('letterSpacing')) return ThemeVariableType.LetterSpacing;
      return ThemeVariableType.Size;
    default:
      return ThemeVariableType.Color;
  }
}

/** Derives the functional category for a color token from its key. */
function resolveColorCategory(key: string): ThemeCategory {
  if (key.startsWith('primary') || key.startsWith('secondary')) return ThemeCategory.Accent;
  if (key === 'borderFocus') return ThemeCategory.Focus;
  if (key.startsWith('border')) return ThemeCategory.Borders;
  if (key.startsWith('surface') || key.startsWith('background')) return ThemeCategory.Surface;
  if (key.startsWith('text')) return ThemeCategory.Fonts;
  if (key === 'headerHover') return ThemeCategory.Hover;
  if (key.startsWith('header')) return ThemeCategory.Header;
  if (key === 'rowHover') return ThemeCategory.Hover;
  if (key.startsWith('row')) return ThemeCategory.Rows;
  if (key.startsWith('cellEdit')) return ThemeCategory.Cells;
  if (key.startsWith('selection')) return ThemeCategory.Selection;
  if (key.startsWith('footer')) return ThemeCategory.Footer;
  if (key.startsWith('pinned')) return ThemeCategory.Pinned;
  if (key.startsWith('filter')) return ThemeCategory.Filters;
  if (key.startsWith('scrollbar')) return ThemeCategory.Scrollbar;
  if (key.startsWith('resizeHandle')) return ThemeCategory.Borders;
  if (key.startsWith('drag')) return ThemeCategory.Drag;
  if (key.startsWith('checkbox')) return ThemeCategory.Checkbox;
  if (key.startsWith('badge')) return ThemeCategory.Status;
  if (key.startsWith('groupRow')) return ThemeCategory.Grouping;
  if (key.startsWith('tooltip')) return ThemeCategory.Tooltip;
  return ThemeCategory.Status; // success/warning/error/info(+Light)
}

/** Derives the functional category for any token from its group + key. */
function resolveCategory(group: string, key: string): ThemeCategory {
  switch (group) {
    case 'colors':
      return resolveColorCategory(key);
    case 'typography':
      return ThemeCategory.Fonts;
    case 'spacing':
      return ThemeCategory.Spacing;
    case 'borders':
      return ThemeCategory.Borders;
    case 'transitions':
      return ThemeCategory.Motion;
    case 'shadows':
      if (key.startsWith('pinned')) return ThemeCategory.Pinned;
      if (key === 'tooltip') return ThemeCategory.Tooltip;
      if (key === 'dragPreview') return ThemeCategory.Drag;
      return ThemeCategory.Surface;
    case 'sizing':
      if (key.startsWith('rowHeight')) return ThemeCategory.Rows;
      if (key.startsWith('header')) return ThemeCategory.Header;
      if (key.startsWith('footer')) return ThemeCategory.Footer;
      if (key.startsWith('filter')) return ThemeCategory.Filters;
      if (key.startsWith('scrollbar')) return ThemeCategory.Scrollbar;
      if (key.startsWith('checkbox')) return ThemeCategory.Checkbox;
      return ThemeCategory.Spacing;
    default:
      return ThemeCategory.Surface;
  }
}

/**
 * Builds the full list of themeable variables from the base theme tokens. Each
 * variable's `cssVar` and `defaultValue` come straight from the token object, so
 * generated names always resolve to a real property.
 */
export function buildDefaultThemeVariables(): ThemeVariable[] {
  const vars: ThemeVariable[] = [];
  const groups = lightTheme.tokens as unknown as Record<string, Record<string, string>>;
  for (const [group, tokens] of Object.entries(groups)) {
    for (const [key, value] of Object.entries(tokens)) {
      const cssVar = `--pg-${toKebab(group)}-${toKebab(key)}`;
      const category = resolveCategory(group, key);
      const type = resolveType(group, key);
      const name = humanize(key);
      vars.push({
        cssVar,
        name,
        category,
        type,
        defaultValue: String(value),
        description: `${name} — ${category} ${type} token.`,
      });
    }
  }
  return vars;
}

/** Registry of themeable `--pg-*` variables. Read surface implements {@link ThemeVariableRegistryReader}. */
export class ThemeVariableRegistry implements ThemeVariableRegistryReader {
  private readonly byName = new Map<string, ThemeVariable>();

  /** Seeds the registry with the base-theme variables (or a supplied list). */
  constructor(initial: readonly ThemeVariable[] = buildDefaultThemeVariables()) {
    for (const v of initial) this.register(v);
  }

  /** Register (or replace) a themeable variable — lets apps expose custom tokens to the AI. */
  register(variable: ThemeVariable): void {
    this.byName.set(variable.cssVar, variable);
  }

  getAll(): readonly ThemeVariable[] {
    return Array.from(this.byName.values());
  }

  getByCategory(category: ThemeCategory): readonly ThemeVariable[] {
    return this.getAll().filter((v) => v.category === category);
  }

  getByName(cssVar: string): ThemeVariable | undefined {
    return this.byName.get(cssVar);
  }

  has(cssVar: string): boolean {
    return this.byName.has(cssVar);
  }

  getCategories(): readonly ThemeCategory[] {
    const seen = new Set<ThemeCategory>();
    for (const v of this.byName.values()) seen.add(v.category);
    return Array.from(seen);
  }
}
