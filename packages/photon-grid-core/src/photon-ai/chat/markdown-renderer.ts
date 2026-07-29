/**
 * Renders parsed Markdown blocks into the Photon AI chat panel's DOM, with a
 * copy button on every code block.
 *
 * Nothing here uses `innerHTML` — see `markdown-parser.ts` for why that
 * matters. Every visible string lands via `textContent`.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../../icons/icon-renderer';
import { createDiv, createElement, clearChildren } from '../../renderer/dom-utils';
import { parseInline, parseMarkdown, type InlineSpan, type MarkdownBlock } from './markdown-parser';

/** How long the copy button shows its success state before reverting, in ms. */
const COPY_FEEDBACK_MS = 1600;

/**
 * Renders Markdown into `host`, replacing its contents.
 *
 * @param host  - Container to render into (cleared first).
 * @param text  - Raw Markdown, typically one assistant reply.
 * @param icons - Icon renderer used for the copy button's glyphs.
 */
export function renderMarkdown(host: HTMLElement, text: string, icons: IconRenderer): void {
  clearChildren(host);
  for (const block of parseMarkdown(text)) {
    host.appendChild(renderBlock(block, icons));
  }
}

function renderBlock(block: MarkdownBlock, icons: IconRenderer): HTMLElement {
  switch (block.kind) {
    case 'code':
      return renderCodeBlock(block.code, block.language, icons);
    case 'heading': {
      const el = createDiv(`pg-ai-md__heading pg-ai-md__heading--${block.level}`);
      appendInline(el, block.text);
      return el;
    }
    case 'list': {
      const list = createElement(block.ordered ? 'ol' : 'ul');
      list.className = 'pg-ai-md__list';
      for (const item of block.items) {
        const li = createElement('li');
        appendInline(li, item);
        list.appendChild(li);
      }
      return list;
    }
    case 'paragraph':
    default: {
      const el = createDiv('pg-ai-md__p');
      block.lines.forEach((line, index) => {
        if (index > 0) el.appendChild(createElement('br'));
        appendInline(el, line);
      });
      return el;
    }
  }
}

/** Appends one line's inline spans to `parent`. */
function appendInline(parent: HTMLElement, line: string): void {
  for (const span of parseInline(line)) {
    parent.appendChild(renderSpan(span));
  }
}

function renderSpan(span: InlineSpan): Node {
  if (span.kind === 'text') return document.createTextNode(span.text);
  const el = createElement(span.kind === 'code' ? 'code' : 'strong');
  el.className = span.kind === 'code' ? 'pg-ai-md__code-inline' : 'pg-ai-md__strong';
  el.textContent = span.text;
  return el;
}

/**
 * A fenced code block: language label, copy button, and the code itself.
 *
 * The copy button prefers the async Clipboard API and falls back to a hidden
 * `<textarea>` + `execCommand` — the panel is commonly embedded in enterprise
 * apps served over plain HTTP or inside iframes without clipboard permission,
 * where the modern API silently rejects.
 */
function renderCodeBlock(code: string, language: string, icons: IconRenderer): HTMLElement {
  const wrap = createDiv('pg-ai-md__code');

  const header = createDiv('pg-ai-md__code-header');
  const label = createElement('span');
  label.className = 'pg-ai-md__code-lang';
  label.textContent = language || 'code';
  header.appendChild(label);

  const copyBtn = createElement('button', {
    type: 'button',
    'aria-label': 'Copy code to clipboard',
    title: 'Copy',
  }) as HTMLButtonElement;
  copyBtn.className = 'pg-ai-md__copy';

  const setIcon = (name: 'copy' | 'check', text: string): void => {
    clearChildren(copyBtn);
    copyBtn.appendChild(icons.render(name, { size: 13 }));
    const span = createElement('span');
    span.textContent = text;
    copyBtn.appendChild(span);
  };
  setIcon('copy', 'Copy');

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  copyBtn.addEventListener('click', () => {
    void copyText(code).then((ok) => {
      setIcon(ok ? 'check' : 'copy', ok ? 'Copied' : 'Press Ctrl+C');
      copyBtn.classList.toggle('pg-ai-md__copy--done', ok);
      if (resetTimer !== null) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        setIcon('copy', 'Copy');
        copyBtn.classList.remove('pg-ai-md__copy--done');
        resetTimer = null;
      }, COPY_FEEDBACK_MS);
    });
  });
  header.appendChild(copyBtn);

  const pre = createElement('pre');
  pre.className = 'pg-ai-md__pre';
  const codeEl = createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  wrap.appendChild(header);
  wrap.appendChild(pre);
  return wrap;
}

/** Copies `text`, returning whether it succeeded. Never throws. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied / insecure context — fall through to the legacy path.
  }
  return legacyCopy(text);
}

/** `execCommand` fallback for insecure contexts, where `navigator.clipboard` is unavailable. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  // Off-screen rather than `display:none` — a hidden element cannot be selected.
  area.style.position = 'fixed';
  area.style.top = '-9999px';
  area.setAttribute('readonly', 'true');
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
