export class IconRenderer {
    constructor(registry) {
        this.registry = registry;
    }
    render(name, options = {}) {
        const wrapper = document.createElement('span');
        wrapper.className = `pg-icon pg-icon--${name}${options.className ? ` ${options.className}` : ''}`;
        wrapper.setAttribute('aria-hidden', 'true');
        wrapper.setAttribute('data-icon', name);
        const size = options.size ?? 16;
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
        }
        else {
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
    renderToString(name, size = 16) {
        const svg = this.registry.get(name);
        if (!svg)
            return '';
        return svg
            .replace('<svg', `<svg width="${size}" height="${size}" style="display:block;"`)
            .replace(/currentColor/g, 'currentColor');
    }
    updateIcon(el, name, options = {}) {
        el.setAttribute('data-icon', name);
        const size = options.size ?? 16;
        const svgContent = this.registry.get(name);
        if (svgContent) {
            el.innerHTML = svgContent;
            const svg = el.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', String(size));
                svg.setAttribute('height', String(size));
            }
        }
    }
    injectSpinKeyframes() {
        if (document.getElementById('pg-icon-keyframes'))
            return;
        const style = document.createElement('style');
        style.id = 'pg-icon-keyframes';
        style.textContent = `@keyframes pg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }
}
//# sourceMappingURL=icon-renderer.js.map