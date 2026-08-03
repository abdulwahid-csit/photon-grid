import type { IconRegistry } from './icon-registry';

export interface IconOptions {
  size?: number;
  color?: string;
  className?: string;
  title?: string;
  rotate?: number;
  spin?: boolean;
}

export class IconRenderer {
  constructor(private registry: IconRegistry) {}

  render(name: string, options: IconOptions = {}): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = `pg-icon pg-icon--${name}${options.className ? ` ${options.className}` : ''}`;
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.setAttribute('data-icon', name);

    const size = options.size ?? 16;
    // Recorded so a later repaint can restore the size this icon was built at
    // — sizes vary from 11px to 48px across the grid.
    wrapper.setAttribute('data-icon-size', String(size));
    wrapper.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${size}px;
      height: ${size}px;
      flex-shrink: 0;
      color: ${options.color ?? 'currentColor'};
      ${options.rotate ? `transform: rotate(${options.rotate}deg);` : ''}
      ${options.spin ? 'animation: pg-spin 0.8s linear infinite;' : ''}
      transition: transform var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base);
    `;

    const svgContent = this.registry.get(name);
    if (svgContent) {
      wrapper.innerHTML = svgContent;
      const svg = wrapper.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.style.display = 'block';
      }
    } else {
      wrapper.style.background = 'currentColor';
      wrapper.style.borderRadius = '2px';
      wrapper.style.opacity = '0.3';
    }

    if (options.title) {
      wrapper.setAttribute('title', options.title);
      wrapper.setAttribute('aria-label', options.title);
      wrapper.removeAttribute('aria-hidden');
    }

    return wrapper;
  }

  /**
   * Renders an icon to a raw SVG string, for assignment into `innerHTML`.
   *
   * The emitted `<svg>` carries `data-icon` / `data-icon-size`, which is what
   * makes a rendered icon findable again: swapping the active icon pack is a
   * `querySelectorAll('[data-icon]')` sweep (see `repaintIcons`) rather than a
   * teardown and rebuild of every subsystem that ever drew one.
   *
   * `width`/`height`/`style` are injected ahead of anything the source markup
   * carries. The HTML parser keeps the *first* of a duplicate attribute, so
   * these win — which is why icon sets must not declare their own.
   *
   * @param name - Registry name. Returns `''` when unresolved, so a missing
   *   icon collapses to nothing rather than throwing.
   * @param size - Edge length in px.
   */
  renderToString(name: string, size = 16): string {
    const svg = this.registry.get(name);
    if (!svg) return '';
    return svg.replace(
      '<svg',
      `<svg data-icon="${name}" data-icon-size="${size}" width="${size}" height="${size}" style="display:block;"`,
    );
  }

  /**
   * Replaces the glyph inside an existing icon container, in place.
   *
   * Used both to reflect a state change (sort direction, filter active) and by
   * the icon repainter when the theme's pack changes.
   */
  updateIcon(el: HTMLElement, name: string, options: IconOptions = {}): void {
    el.setAttribute('data-icon', name);
    const size = options.size ?? 16;
    el.setAttribute('data-icon-size', String(size));

    const svgContent = this.registry.get(name);
    if (!svgContent) {
      // Clearing rather than leaving the previous glyph in place: a name that no
      // longer resolves should read as "no icon", not as the last one that did.
      el.innerHTML = '';
      return;
    }

    el.innerHTML = svgContent;
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
    }
  }

  injectSpinKeyframes(): void {
    if (document.getElementById('pg-icon-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'pg-icon-keyframes';
    style.textContent = `@keyframes pg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
}
