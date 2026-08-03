/**
 * A deliberately small, safe Markdown renderer for the Photon AI chat panel.
 *
 * ### Why not a Markdown library
 * Photon Grid Core is a zero-dependency package, and this needs to render a
 * *known, narrow* subset produced by our own system prompt — fenced code,
 * inline code, bold, headings, and lists. A general parser would add weight and
 * a much larger attack surface for no benefit.
 *
 * ### Safety
 * Model output is untrusted input. Nothing here ever assigns `innerHTML`;
 * every piece of text reaches the DOM through `textContent`, so a reply
 * containing `<img onerror=...>` renders as literal characters. This is the
 * single most important property of this file — if you add a feature here,
 * keep it true.
 *
 * @packageDocumentation
 */

/** One parsed top-level block of a reply. */
export type MarkdownBlock =
  | { readonly kind: 'paragraph'; readonly lines: readonly string[] }
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: 'code'; readonly language: string; readonly code: string };

/** An inline span within a paragraph, list item, or heading. */
export type InlineSpan =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string };

const FENCE_RE = /^\s*```(\w*)\s*$/;
const HEADING_RE = /^(#{1,4})\s+(.*)$/;
const UNORDERED_RE = /^\s*[-*]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Splits a reply into blocks.
 *
 * An unterminated fence (very common mid-stream, while the typewriter has only
 * revealed half a code block) is treated as a code block running to the end of
 * the text — so a partially-streamed reply renders as a growing code block
 * rather than briefly flashing its source as paragraphs.
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const language = fence[1] ?? '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // consume the closing fence (harmless when absent — see doc comment)
      blocks.push({ kind: 'code', language, code: body.join('\n') });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    const listMatch = matchListItem(line);
    if (listMatch) {
      const ordered = listMatch.ordered;
      const items: string[] = [];
      while (i < lines.length) {
        const next = matchListItem(lines[i]);
        if (!next || next.ordered !== ordered) break;
        items.push(next.text);
        i++;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    // Plain prose — accumulate until a blank line or a block-level construct.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i];
      if (
        current.trim().length === 0 ||
        FENCE_RE.test(current) ||
        HEADING_RE.test(current) ||
        matchListItem(current)
      ) {
        break;
      }
      paragraph.push(current);
      i++;
    }
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', lines: paragraph });
  }

  return blocks;
}

function matchListItem(line: string): { ordered: boolean; text: string } | null {
  const unordered = UNORDERED_RE.exec(line);
  if (unordered) return { ordered: false, text: unordered[1] };
  const ordered = ORDERED_RE.exec(line);
  if (ordered) return { ordered: true, text: ordered[1] };
  return null;
}

/**
 * Splits one line into inline spans: `` `code` `` and `**strong**`.
 *
 * Code wins over emphasis, so `` `**not bold**` `` stays literal — matching
 * how every Markdown implementation (and every reader's expectation) behaves.
 */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let buffer = '';

  const flush = (): void => {
    if (buffer.length > 0) {
      spans.push({ kind: 'text', text: buffer });
      buffer = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        spans.push({ kind: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        spans.push({ kind: 'strong', text: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }

  flush();
  return spans;
}
