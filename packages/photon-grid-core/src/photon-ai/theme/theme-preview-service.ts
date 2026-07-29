/**
 * The **Theme Preview Service** — applies a theme's variables to the grid live,
 * with no rebuild and no flicker, by setting inline `--pg-*` custom properties on
 * the grid container (which override the scoped mode stylesheet). Delegates to
 * {@link ThemeManager.applyTokenOverrides} / {@link ThemeManager.clearTokenOverrides},
 * which also mirror onto `document.documentElement` so portaled menus re-theme too.
 *
 * @packageDocumentation
 */

import type { ThemeManager } from '../../theme/theme-manager';

/** Applies/reverts live theme variable overrides on the grid container. */
export class ThemePreviewService {
  constructor(
    private readonly themeManager: ThemeManager,
    private readonly container: HTMLElement,
  ) {}

  /** Set the given `--pg-*` variables inline on the container (instant preview). */
  apply(variables: Readonly<Record<string, string>>): void {
    this.themeManager.applyTokenOverrides(variables, this.container);
  }

  /** Remove all live overrides, reverting to the active mode/variant. */
  clear(): void {
    this.themeManager.clearTokenOverrides(this.container);
  }
}
