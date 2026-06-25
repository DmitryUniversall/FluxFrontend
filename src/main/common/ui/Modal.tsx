import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "./Button";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    width?: number;
    /** Optional `data-tour` id on the dialog, so the onboarding guide can target it. */
    tourId?: string;
}

export function Modal({ open, onClose, title, children, footer, width = 460, tourId }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onMouseDown={onClose}
                >
                    <motion.div
                        className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
                        style={{ width }}
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        onMouseDown={(e) => e.stopPropagation()}
                        data-tour={tourId}
                    >
                        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                            <h2 className="text-sm font-semibold">{title}</h2>
                            <IconButton label="Close" onClick={onClose}>
                                <X size={16} />
                            </IconButton>
                        </div>
                        <div className="px-5 py-4">{children}</div>
                        {footer && (
                            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
