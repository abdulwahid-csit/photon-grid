export class RowPositionSheet {
  private styleEl: HTMLStyleElement | null = null;

  mount(): void {
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-pg-row-positions', '');
    document.head.appendChild(this.styleEl);
  }

  update(rows: ReadonlyArray<{ nodeId: string; top: number; height: number }>, autoHeight = false): void {
    if (!this.styleEl) return;
    const rules: string[] = [];
    for (const r of rows) {
      if (autoHeight) {
        rules.push(`.pg-row[data-node-id="${r.nodeId}"]{top:${r.top}px;min-height:${r.height}px;}`);
      } else {
        rules.push(`.pg-row[data-node-id="${r.nodeId}"]{top:${r.top}px;height:${r.height}px;}`);
      }
    }
    this.styleEl.textContent = rules.join('');
  }

  destroy(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }
}
