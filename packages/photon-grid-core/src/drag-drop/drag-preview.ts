import { DragGhost } from './drag-ghost';
import { portalHostFor } from '../theme/overlay-portal';

/**
 * Content of the floating chip shown while a {@link DragDropEngine} drag is in
 * progress. Every field is optional; omitted parts are simply not built.
 */
export interface DragPreviewOptions {
  /** Text shown in the chip. Defaults to `'Dragging'`. */
  label?: string;
  /** Pre-rendered icon markup, injected before the label. */
  icon?: string;
  /** Multi-item badge. Only rendered when greater than `1`. */
  count?: number;
  /** Avatar image source. Implies an avatar slot even without `shape`. */
  avatarUrl?: string;
  /** Avatar silhouette. Defaults to `'circle'`. */
  shape?: 'circle' | 'square';
}

/**
 * The floating chip that follows the cursor during a generic drag.
 *
 * Structure is rebuilt per gesture (the label, icon, and badge differ each time);
 * positioning is delegated to {@link DragGhost}, so movement is a compositor-only
 * transform rather than a layout-dirtying `left` / `top` write.
 *
 * Visual styling belongs entirely to the `.pg-drag-preview` rules in the theme
 * stylesheet — this class only builds semantic children and data-driven classes.
 */
export class DragPreview {
  private readonly ghost = new DragGhost();
  private offsetX = 12;
  private offsetY = 12;

  /**
   * Builds a chip, appends it to the owning grid's portal host, and takes
   * ownership of its position.
   *
   * Any previous chip is destroyed first, so a re-entrant drag start cannot leak
   * an orphaned element.
   *
   * @param options - Label, icon, count badge, and optional avatar metadata.
   * @param originEl - The dragged element, used to resolve which grid's portal
   *                   host the chip belongs to so it wears that grid's theme.
   *                   Omit outside a grid; the chip then falls back to `<body>`.
   * @returns The created element, for callers that need to decorate it further.
   */
  create(options: DragPreviewOptions = {}, originEl?: HTMLElement | null): HTMLElement {
    this.destroy();

    const preview = document.createElement('div');
    preview.className = 'pg-drag-preview';

    if (options.avatarUrl || options.shape) {
      const avatar = document.createElement('div');
      const shape = options.shape ?? 'circle';
      avatar.className = `pg-drag-preview__avatar pg-drag-preview__avatar--${shape}`;
      if (options.avatarUrl) {
        const img = document.createElement('img');
        img.className = 'pg-drag-preview__avatar-img';
        img.src = options.avatarUrl;
        avatar.appendChild(img);
      }
      preview.appendChild(avatar);
    }

    if (options.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'pg-drag-preview__icon';
      iconSpan.innerHTML = options.icon;
      preview.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pg-drag-preview__label';
    labelSpan.textContent = options.label ?? 'Dragging';
    preview.appendChild(labelSpan);

    if (options.count && options.count > 1) {
      const badge = document.createElement('span');
      badge.className = 'pg-drag-preview__badge';
      badge.textContent = String(options.count);
      preview.appendChild(badge);
    }

    portalHostFor(originEl).appendChild(preview);
    this.ghost.attach(preview, this.offsetX, this.offsetY);
    return preview;
  }

  /**
   * Moves the chip to a cursor position.
   *
   * Safe to call at pointer-event frequency: an unchanged position performs no
   * DOM write, and a changed one costs two custom-property assignments that the
   * compositor resolves without layout.
   *
   * @param x - Client x coordinate of the cursor.
   * @param y - Client y coordinate of the cursor.
   */
  moveTo(x: number, y: number): void {
    this.ghost.moveTo(x, y);
  }

  /**
   * Sets the cursor-relative offset used by {@link moveTo}.
   *
   * Takes effect on the next {@link create}, and immediately for an already-live
   * chip.
   *
   * @param x - Horizontal offset in CSS pixels.
   * @param y - Vertical offset in CSS pixels.
   */
  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
    const el = this.ghost.element;
    if (el) this.ghost.attach(el, x, y);
  }

  /** The live chip element, or `null` when no drag is in progress. */
  get element(): HTMLElement | null {
    return this.ghost.element;
  }

  /** Removes the current chip from the DOM. Safe to call when none exists. */
  destroy(): void {
    this.ghost.detach();
  }
}
