/**
 * The **Theme Validator** — the security and correctness gate between raw LLM
 * (or imported) output and the live grid. It guarantees the engine never applies
 * an invalid or dangerous value:
 *
 *  1. **Unknown variables** (not in the {@link ThemeVariableRegistry}) are rejected —
 *     the AI can only touch real Photon tokens, never invented ones.
 *  2. **Malformed values** are rejected per the variable's {@link ThemeVariableType}
 *     (color / size / opacity / shadow / font / duration / easing / …).
 *  3. **Injection payloads** are rejected up front — any value containing CSS
 *     control characters or dangerous functions (`; { } url( expression
 *     javascript: @import <`) can never reach `setProperty`.
 *
 * It is pure and DOM-free, so it is trivially unit-testable and reused for both
 * generated and imported themes.
 *
 * @packageDocumentation
 */

import { ThemeVariableType } from '../../types/theme-ai.types';
import type {
  RejectedThemeVariable,
  ThemeValidationResult,
  ThemeVariableRegistryReader,
} from '../../types/theme-ai.types';

/** Characters/sequences that must never appear in a token value (CSS-injection guard). */
const UNSAFE_VALUE = /[;{}<>]|url\s*\(|expression\s*\(|javascript:|@import|\/\*|\*\//i;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /^(rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i; // green, red, teal, transparent, currentColor…
const SIZE = /^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch)$/i;
const ZERO = /^0$/;
const NUMBER = /^-?\d*\.?\d+$/;
const DURATION = /^\d*\.?\d+(ms|s)$/i;
const EASING = /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(\s*[0-9.,\s-]+\)|steps\(\s*[0-9a-z,\s-]+\))$/i;
const FONT_WEIGHT = /^([1-9]00|normal|bold|lighter|bolder)$/i;
const BORDER_STYLE = /^(solid|dashed|dotted|double|none)$/i;

/** Validates and sanitizes a raw variable map against the registry. */
export class ThemeValidator {
  constructor(private readonly registry: ThemeVariableRegistryReader) {}

  /**
   * Validate a raw `{ cssVar: value }` map. Returns the accepted subset plus a
   * list of rejected entries with reasons. `valid` is `true` only when nothing
   * was rejected; the accepted subset is always safe to apply either way.
   */
  validate(rawVariables: unknown): ThemeValidationResult {
    const accepted: Record<string, string> = {};
    const rejected: RejectedThemeVariable[] = [];

    if (typeof rawVariables !== 'object' || rawVariables === null) {
      return { valid: false, variables: {}, rejected: [] };
    }

    for (const [cssVar, rawValue] of Object.entries(rawVariables as Record<string, unknown>)) {
      const value = typeof rawValue === 'number' ? String(rawValue) : rawValue;
      if (typeof value !== 'string') {
        rejected.push({ cssVar, value: String(rawValue), reason: 'Value is not a string.' });
        continue;
      }
      const trimmed = value.trim();

      const variable = this.registry.getByName(cssVar);
      if (!variable) {
        rejected.push({ cssVar, value: trimmed, reason: 'Unknown variable (not a Photon theme token).' });
        continue;
      }
      if (UNSAFE_VALUE.test(trimmed) || trimmed.length > 200) {
        rejected.push({ cssVar, value: trimmed, reason: 'Value contains disallowed characters.' });
        continue;
      }
      if (variable.allowedValues && !variable.allowedValues.includes(trimmed)) {
        rejected.push({ cssVar, value: trimmed, reason: 'Value not in the allowed set.' });
        continue;
      }
      if (!ThemeValidator.isValidForType(variable.type, trimmed)) {
        rejected.push({ cssVar, value: trimmed, reason: `Invalid ${variable.type} value.` });
        continue;
      }
      accepted[cssVar] = trimmed;
    }

    return { valid: rejected.length === 0, variables: accepted, rejected };
  }

  /** Type-specific value grammar check (assumes the injection guard already passed). */
  static isValidForType(type: ThemeVariableType, value: string): boolean {
    switch (type) {
      case ThemeVariableType.Color:
        return (
          HEX.test(value) ||
          COLOR_FN.test(value) ||
          value.toLowerCase() === 'transparent' ||
          value.toLowerCase() === 'currentcolor' ||
          NAMED_COLOR.test(value)
        );
      case ThemeVariableType.Size:
      case ThemeVariableType.LetterSpacing:
        return SIZE.test(value) || ZERO.test(value) || value.toLowerCase() === 'normal';
      case ThemeVariableType.Number:
      case ThemeVariableType.LineHeight:
        return NUMBER.test(value);
      case ThemeVariableType.Opacity: {
        const n = Number(value);
        return NUMBER.test(value) && n >= 0 && n <= 1;
      }
      case ThemeVariableType.Duration:
        return DURATION.test(value);
      case ThemeVariableType.Easing:
        return EASING.test(value);
      case ThemeVariableType.FontWeight:
        return FONT_WEIGHT.test(value);
      case ThemeVariableType.BorderStyle:
        return BORDER_STYLE.test(value);
      case ThemeVariableType.Shadow:
        // Already injection-guarded; accept "none" or a plausible shadow (has an offset/length or color).
        return value.toLowerCase() === 'none' || /\d|rgb|hsl|#/i.test(value);
      case ThemeVariableType.FontFamily:
        // Injection-guarded; a non-empty family list is acceptable.
        return value.length > 0;
      default:
        return false;
    }
  }
}
