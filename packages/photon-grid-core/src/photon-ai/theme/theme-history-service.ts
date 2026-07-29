/**
 * The **Theme History Service** — a bounded undo/redo stack of applied themes.
 * A linear history with a cursor: pushing after an undo truncates the redo tail
 * (standard editor semantics). Undoing past the first entry returns `null`,
 * meaning "revert to the base mode/variant".
 *
 * @packageDocumentation
 */

import type { GeneratedTheme, ThemeHistoryEntry } from '../../types/theme-ai.types';

/** Default maximum number of retained history entries. */
export const DEFAULT_THEME_HISTORY_LIMIT = 50;

/** Undo/redo/restore stack for applied themes. */
export class ThemeHistoryService {
  private entries: ThemeHistoryEntry[] = [];
  /** Index of the current entry, or -1 when at the base (no theme). */
  private cursor = -1;
  private seq = 0;

  constructor(private readonly limit: number = DEFAULT_THEME_HISTORY_LIMIT) {}

  /** Record a newly applied theme as the current state (truncates any redo tail). */
  push(theme: GeneratedTheme): void {
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push({ theme, index: this.seq++ });
    if (this.entries.length > this.limit) this.entries.shift();
    this.cursor = this.entries.length - 1;
  }

  /** The current theme, or `null` at the base. */
  current(): GeneratedTheme | null {
    return this.cursor >= 0 ? this.entries[this.cursor].theme : null;
  }

  /** Step back one entry. Returns the now-current theme, or `null` if it reached the base. */
  undo(): GeneratedTheme | null {
    if (this.cursor < 0) return null;
    this.cursor -= 1;
    return this.current();
  }

  /** Step forward one entry. Returns the now-current theme, or `null` if already at the newest. */
  redo(): GeneratedTheme | null {
    if (this.cursor >= this.entries.length - 1) return null;
    this.cursor += 1;
    return this.current();
  }

  /** Restore a specific entry by its monotonic index. */
  restore(index: number): GeneratedTheme | null {
    const at = this.entries.findIndex((e) => e.index === index);
    if (at < 0) return null;
    this.cursor = at;
    return this.current();
  }

  /** Clear the entire history (back to base). */
  reset(): void {
    this.entries = [];
    this.cursor = -1;
    this.seq = 0;
  }

  /** The full history stack, oldest first. */
  getAll(): readonly ThemeHistoryEntry[] {
    return this.entries;
  }
}
