import { useEffect, useState } from "react";

export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const read = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const same = (a: Rect | null, b: Rect | null): boolean =>
    a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * Live-tracks a target element's viewport rect by selector, returning null while
 * the element is absent (e.g. a panel a step's `onEnter` is still opening). We
 * poll on animation frames rather than wiring observers per call site: it's a
 * single element and rAF naturally follows scrolling, panel open/close
 * animations and layout shifts. Updates state only when the rect actually
 * changes, so idle steps don't re-render.
 */
export function useTargetRect(selector: string | null, active: boolean): Rect | null {
    const [rect, setRect] = useState<Rect | null>(null);

    useEffect(() => {
        if (!active || !selector) {
            setRect(null);
            return;
        }
        let raf = 0;
        let prev: Rect | null = null;
        const tick = () => {
            const el = document.querySelector(selector);
            const next = el ? read(el) : null;
            if (!same(prev, next)) {
                prev = next;
                setRect(next);
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [selector, active]);

    return rect;
}

/** Viewport size, kept current on resize - used to size the dimming overlay. */
export function useViewport(): { w: number; h: number } {
    const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
    useEffect(() => {
        const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return size;
}
