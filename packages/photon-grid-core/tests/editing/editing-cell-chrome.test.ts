import { describe, it, expect } from 'vitest';

import { editorsSystemCss } from '../../src/styles/base/editors-system.css';
import { cellsCss } from '../../src/styles/base/cells.css';

/**
 * The editing cell's chrome, as a contract rather than as whatever the
 * stylesheet happens to say today.
 *
 * These are the things a user sees the instant a cell opens — the ring around
 * it, its corner radius, and the absence of the fill handle. The ring in
 * particular has a history: drawn as `.pg-cell--editing::after`, it was deleted
 * outright by the selection system's `content: none` rules, which are two and
 * three classes deep against its one. Nothing failed; the pseudo-element simply
 * was never generated, and the cell showed no ring at all.
 *
 * Asserting on stylesheet text is crude, but it is the only level at which these
 * hold without a real layout engine: jsdom computes no styles, so a DOM test
 * would pass just as happily against an empty stylesheet.
 */

/** Collapses whitespace so a rule can be matched regardless of its formatting. */
const css = editorsSystemCss.replace(/\s+/g, ' ');
const cells = cellsCss.replace(/\s+/g, ' ');

/** The declarations of the first rule whose selector list contains `selector`. */
function ruleFor(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}[^{}]*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
}

describe('the editing cell ring', () => {
  const ring = ruleFor('.pg-cell--editing {');

  it('is a real outline on the cell, not a pseudo-element', () => {
    // ::after on a cell belongs to the selection system, which deletes it on
    // the active cell — and an editing cell is always the active cell.
    expect(ring).toContain('outline:');
    expect(css).not.toContain('.pg-cell--editing::after {');
  });

  it('is 2px by default', () => {
    expect(ring).toContain('var(--pg-cell-editing-outline-width, 2px)');
  });

  it('takes its colour from the active theme', () => {
    // Primary is what every theme retints; the ring must follow it rather than
    // pinning a literal that would survive a theme change.
    expect(ring).toContain(
      'var(--pg-cell-editing-outline-color, var(--pg-colors-primary, #2563eb))',
    );
  });

  it('has a 4px radius by default', () => {
    expect(ring).toContain('border-radius: var(--pg-cell-editing-radius, 4px);');
  });

  it('is drawn inside the cell, where the next column cannot paint over it', () => {
    expect(ring).toContain('outline-offset: calc(var(--pg-cell-editing-outline-width, 2px) * -1)');
  });

  it('is themeable through its own tokens, not the shared focus ones', () => {
    // --pg-borders-width-focus and --pg-borders-radius-sm are shared with
    // buttons, inputs and panels; retuning those must not move this ring.
    expect(ring).not.toContain('--pg-borders-width-focus');
    expect(ring).not.toContain('--pg-borders-radius-sm');
  });

  it('still resolves to a system colour in forced-colours mode', () => {
    // A token-based outline collapses to nothing when the OS replaces every
    // colour, so the high-contrast override has to stay.
    expect(css).toContain('.pg-cell--editing { outline-color: Highlight; }');
  });
});

describe('the selection system still owns ::after', () => {
  it('deletes it on the active cell — the trap the outline exists to avoid', () => {
    // If these ever stop removing the pseudo-element, the note explaining why
    // the ring is an outline becomes wrong and should be revisited. Until then
    // this pins the reason.
    expect(cells).toContain('.pg-cell--active-cell:not(.pg-cell--in-selection)::after { content: none; }');
    expect(cells).toContain(
      '.pg-cell--single-cell-selection.pg-cell--in-selection.pg-cell--active-cell::after { content: none; }',
    );
  });

  it('has its range outline suppressed under an editing cell, so only one frame shows', () => {
    expect(css).toContain('.pg-cell--editing.pg-cell--in-selection::after { border-width: 0; }');
  });
});

describe('the fill handle while editing', () => {
  it('is hidden, not merely covered', () => {
    // display:none also takes it out of hit-testing, so a press on the corner
    // cannot start a fill drag out of an open editor.
    expect(css).toContain('.pg-cell--editing .pg-fill-handle { display: none; }');
  });
});

describe('the rejection pulse', () => {
  it('animates the outline, since the pseudo-element it used to recolour is gone', () => {
    expect(css).toContain('.pg-cell--editing.pg-cell--invalid-flash { animation: pg-editor-invalid-pulse');
    expect(css).not.toContain('.pg-cell--invalid-flash::after');
  });

  it('settles back to the ring colour rather than to primary directly', () => {
    // Otherwise a grid that retinted the ring watches every rejection fade to
    // a colour it had overridden away.
    expect(css).toContain(
      '100% { outline-color: var(--pg-cell-editing-outline-color, var(--pg-colors-primary, #2563eb)); }',
    );
  });

  it('gives a cell with no editor open a ring to pulse', () => {
    // onInvalid: 'accept' commits without an editor, so there is no editing
    // outline to recolour — it needs a transparent one of its own.
    const standalone = ruleFor('.pg-cell--invalid-flash:not(.pg-cell--editing) {');
    expect(standalone).toContain('outline: var(--pg-cell-editing-outline-width, 2px) solid transparent');
  });

  it('falls back to a steady colour when motion is reduced', () => {
    // With the animation off, a pulse that only ever existed as motion would
    // leave no signal at all.
    expect(css).toContain('outline-color: var(--pg-colors-danger, #dc2626); }');
  });
});
