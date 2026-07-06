import { normalizeRange } from './selection-range';
export class SelectionRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }
    attach(containerEl) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'pg-selection-canvas';
        this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 10;
      border-radius: 0;
    `;
        containerEl.style.position = 'relative';
        containerEl.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }
    detach() {
        this.canvas?.remove();
        this.canvas = null;
        this.ctx = null;
    }
    resize(width, height) {
        if (!this.canvas)
            return;
        this.canvas.width = width;
        this.canvas.height = height;
    }
    render(ranges, activeCell, getCellRect, options = {}) {
        if (!this.ctx || !this.canvas)
            return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const fillColor = options.fillColor ?? 'rgba(37, 99, 235, 0.08)';
        const borderColor = options.borderColor ?? 'rgba(37, 99, 235, 0.85)';
        const cornerColor = options.cornerColor ?? '#2563eb';
        const cornerSize = options.cornerSize ?? 5;
        const borderWidth = options.borderWidth ?? 1.5;
        for (const range of ranges) {
            this.renderRange(range, getCellRect, fillColor, borderColor, borderWidth);
            this.renderCorner(range, getCellRect, cornerColor, cornerSize);
        }
        if (activeCell) {
            const rect = getCellRect(activeCell.rowIndex, activeCell.colIndex);
            if (rect) {
                this.renderActiveCell(rect, borderColor, borderWidth);
            }
        }
    }
    clear() {
        if (!this.ctx || !this.canvas)
            return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    renderRange(range, getCellRect, fillColor, borderColor, borderWidth) {
        if (!this.ctx)
            return;
        const n = normalizeRange(range);
        const topLeft = getCellRect(n.startRowIndex, n.startColIndex);
        const bottomRight = getCellRect(n.endRowIndex, n.endColIndex);
        if (!topLeft || !bottomRight)
            return;
        const containerRect = this.canvas.getBoundingClientRect();
        const x = topLeft.left - containerRect.left;
        const y = topLeft.top - containerRect.top;
        const w = bottomRight.right - topLeft.left;
        const h = bottomRight.bottom - topLeft.top;
        this.ctx.save();
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        this.ctx.restore();
    }
    renderCorner(range, getCellRect, cornerColor, cornerSize) {
        if (!this.ctx)
            return;
        const n = normalizeRange(range);
        const bottomRight = getCellRect(n.endRowIndex, n.endColIndex);
        if (!bottomRight)
            return;
        const containerRect = this.canvas.getBoundingClientRect();
        const cx = bottomRight.right - containerRect.left;
        const cy = bottomRight.bottom - containerRect.top;
        this.ctx.save();
        this.ctx.fillStyle = cornerColor;
        this.ctx.fillRect(cx - cornerSize, cy - cornerSize, cornerSize * 2, cornerSize * 2);
        this.ctx.restore();
    }
    renderActiveCell(rect, borderColor, borderWidth) {
        if (!this.ctx || !this.canvas)
            return;
        const containerRect = this.canvas.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        this.ctx.save();
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = borderWidth + 0.5;
        this.ctx.strokeRect(x + 1, y + 1, rect.width - 2, rect.height - 2);
        this.ctx.restore();
    }
}
//# sourceMappingURL=selection-renderer.js.map