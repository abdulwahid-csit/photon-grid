export function createElement(tag, attrs = {}, cssText) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        if (typeof val === 'boolean') {
            if (val)
                el.setAttribute(key, '');
        }
        else {
            el.setAttribute(key, String(val));
        }
    }
    if (cssText)
        el.style.cssText = cssText;
    return el;
}
export function createDiv(className, cssText) {
    const el = document.createElement('div');
    if (className)
        el.className = className;
    if (cssText)
        el.style.cssText = cssText;
    return el;
}
export function setStyles(el, styles) {
    Object.assign(el.style, styles);
}
export function clearChildren(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}
export function replaceChildren(el, ...children) {
    clearChildren(el);
    for (const child of children)
        el.appendChild(child);
}
export function addClasses(el, ...classes) {
    for (const cls of classes) {
        if (cls)
            el.classList.add(cls);
    }
}
export function removeClasses(el, ...classes) {
    for (const cls of classes) {
        if (cls)
            el.classList.remove(cls);
    }
}
export function toggleClass(el, cls, condition) {
    if (condition) {
        el.classList.add(cls);
    }
    else {
        el.classList.remove(cls);
    }
}
export function getScrollbarWidth() {
    const outer = document.createElement('div');
    outer.style.cssText = 'visibility:hidden;overflow:scroll;position:absolute;top:-9999px;';
    document.body.appendChild(outer);
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const width = outer.offsetWidth - inner.offsetWidth;
    document.body.removeChild(outer);
    return width;
}
export function measureTextWidth(text, font) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return text.length * 8;
    ctx.font = font;
    return ctx.measureText(text).width;
}
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function getElementOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
    };
}
export function isScrolledIntoView(el, container) {
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
}
export function scrollIntoViewIfNeeded(el, container) {
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (elRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - elRect.top;
    }
    else if (elRect.bottom > containerRect.bottom) {
        container.scrollTop += elRect.bottom - containerRect.bottom;
    }
}
export function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
export function throttle(fn, interval) {
    let lastCall = 0;
    return (...args) => {
        const now = performance.now();
        if (now - lastCall >= interval) {
            lastCall = now;
            fn(...args);
        }
    };
}
export function raf(fn) {
    let id = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(id);
}
export function rafLoop(fn) {
    let last = 0;
    let id;
    const tick = (ts) => {
        fn(ts - last);
        last = ts;
        id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
}
//# sourceMappingURL=dom-utils.js.map