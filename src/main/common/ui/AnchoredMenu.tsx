// A dropdown menu that renders in a portal anchored to a trigger element, so it
// floats above every panel and is never clipped by a scrolling container (the
// problem with absolutely-positioned menus inside the editors). Handles
// outside-click, Esc, and repositioning on scroll/resize.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Props {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onClose: () => void;
    children: ReactNode;
    width?: number;
    align?: "left" | "right" | "center";
    /** Open below the trigger ("bottom") or above it ("top"). Default "bottom". */
    placement?: "bottom" | "top";
    /** Optional data-tour id on the menu (so the onboarding can highlight items). */
    tourId?: string;
}

interface Pos {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    transform?: string;
    maxHeight: number;
}

const GAP = 4;
const MARGIN = 8;

export function AnchoredMenu({
    open,
    anchorRef,
    onClose,
    children,
    width = 208,
    align = "left",
    placement = "bottom",
    tourId,
}: Props) {
    const [pos, setPos] = useState<Pos | null>(null);

    useEffect(() => {
        if (!open) return;
        const compute = () => {
            const el = anchorRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const next: Pos = { maxHeight: 360 };

            if (align === "right") next.right = Math.max(MARGIN, vw - r.right);
            else if (align === "center") {
                next.left = r.left + r.width / 2;
                next.transform = "translateX(-50%)";
            } else next.left = Math.min(r.left, vw - width - MARGIN);

            if (placement === "top") {
                next.bottom = vh - r.top + GAP;
                next.maxHeight = r.top - GAP - MARGIN;
            } else {
                next.top = r.bottom + GAP;
                next.maxHeight = vh - r.bottom - GAP - MARGIN;
            }
            setPos(next);
        };
        compute();
        window.addEventListener("scroll", compute, true);
        window.addEventListener("resize", compute);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("scroll", compute, true);
            window.removeEventListener("resize", compute);
            window.removeEventListener("keydown", onKey);
        };
    }, [open, anchorRef, align, placement, width, onClose]);

    return createPortal(
        <AnimatePresence>
            {open && pos && (
                <>
                    {/* transparent catcher so a click anywhere else closes the menu. Sits
              above the page and the guide dim, but below the guide ring/callout
              so a tour can highlight a menu item. */}
                    <div className="fixed inset-0 z-[105]" onMouseDown={onClose} />
                    <motion.div
                        data-tour={tourId}
                        className="fixed z-[106] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                        style={{
                            left: pos.left,
                            right: pos.right,
                            top: pos.top,
                            bottom: pos.bottom,
                            transform: pos.transform,
                            width,
                            maxHeight: Math.max(120, pos.maxHeight),
                        }}
                        initial={{ opacity: 0, scale: 0.97, y: placement === "top" ? 4 : -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}
