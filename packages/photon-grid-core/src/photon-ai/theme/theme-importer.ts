/**
 * The **Theme Importer** — parses a theme from JSON text or an object, validates
 * every variable against the registry, and returns a clean {@link GeneratedTheme}.
 * It is strict: an import with any unknown variable or malformed/unsafe value is
 * rejected wholesale, so a hand-edited or hostile file can never be applied.
 *
 * @packageDocumentation
 */

import type { GeneratedTheme } from '../../types/theme-ai.types';
import { PhotonThemeError, readString } from './theme-llm-client';
import type { ThemeValidator } from './theme-validator';

/** Validates and normalizes externally-supplied themes. */
export class ThemeImporter {
  constructor(private readonly validator: ThemeValidator) {}

  /**
   * Parse + validate a theme from JSON text or an object.
   * @throws {@link PhotonThemeError} on invalid JSON, wrong shape, or any
   *   rejected variable.
   */
  import(source: string | GeneratedTheme): GeneratedTheme {
    let parsed: unknown = source;
    if (typeof source === 'string') {
      try {
        parsed = JSON.parse(source);
      } catch {
        throw new PhotonThemeError('Invalid theme JSON.');
      }
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new PhotonThemeError('A theme must be a JSON object.');
    }

    const record = parsed as Record<string, unknown>;
    const validation = this.validator.validate(record.variables);

    if (validation.rejected.length > 0) {
      const detail = validation.rejected.map((r) => `${r.cssVar} (${r.reason})`).join('; ');
      throw new PhotonThemeError(`Theme rejected — invalid variables: ${detail}`);
    }
    if (Object.keys(validation.variables).length === 0) {
      throw new PhotonThemeError('Theme contained no valid Photon variables.');
    }

    return {
      themeName: readString(record.themeName, 'Imported theme'),
      description: readString(record.description),
      variables: validation.variables,
    };
  }
}
