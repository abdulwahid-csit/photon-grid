export class DragPreview {
    constructor() {
        this.el = null;
        this.offsetX = 12;
        this.offsetY = 12;
    }
    /**
     * Create a theme-styled floating drag preview.
     *
     * Visual styling belongs to `.pg-drag-preview` CSS rules; this method only
     * builds semantic children and data-driven classes.
     *
     * @param options - Label, icon, count badge, and optional avatar metadata.
     */
    create(options = {}) {
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
        document.body.appendChild(preview);
        this.el = preview;
        return preview;
    }
    moveTo(x, y) {
        if (!this.el)
            return;
        this.el.style.transform = `translate(${x + this.offsetX}px, ${y + this.offsetY}px)`;
    }
    /**
     * Set the cursor-relative offset used by {@link moveTo}.
     *
     * @param x - Horizontal offset in CSS pixels.
     * @param y - Vertical offset in CSS pixels.
     */
    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
    }
    /** Remove the current preview element from the DOM. */
    destroy() {
        if (this.el) {
            this.el.remove();
            this.el = null;
        }
    }
}
//# sourceMappingURL=drag-preview.js.map