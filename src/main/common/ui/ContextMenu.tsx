// Generic cursor-anchored context menu. The response viewer uses it to expose
// per-field actions (the heart of the "save to environment" feature), but it's
// intentionally feature-agnostic.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

export interface MenuItem {
    id: string;
    label: string;
    icon?: ReactNode;
    danger?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void;
}

export interface MenuPosition {
    x: number;
    y: number;
}

interface ContextMenuProps {
    position: MenuPosition | null;
    items: MenuItem[];
    onClose: () => void;
}

export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<MenuPosition | null>(position);

    useEffect(() => setPos(position), [position]);

    // Keep the menu inside the viewport.
    useLayoutEffect(() => {
        if (!position || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        let { x, y } = position;
        if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
        if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
        setPos({ x, y });
    }, [position]);

    useEffect(() => {
        if (!position) return;
        const close = () => onClose();
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("click", close);
        window.addEventListener("contextmenu", close);
        window.addEventListener("scroll", close, true);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("contextmenu", close);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("keydown", onKey);
        };
    }, [position, onClose]);

    return (
        <AnimatePresence>
            {position && pos && (
                <motion.div
                    ref={ref}
                    className="fixed z-[60] min-w-[210px] overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                    style={{ left: pos.x, top: pos.y }}
                    initial={{ opacity: 0, scale: 0.96, y: -2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {items.map((item) => (
                        <div key={item.id}>
                            {item.separatorBefore && <div className="my-1 h-px bg-border" />}
                            <button
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                                    item.danger
                                        ? "text-red-400 hover:bg-red-500/10"
                                        : "text-fg hover:bg-accent/15 hover:text-accent",
                                )}
                                onClick={() => {
                                    item.onSelect();
                                    onClose();
                                }}
                            >
                                {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
                                {item.label}
                            </button>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
