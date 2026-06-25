import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { create } from "zustand";

type ToastKind = "success" | "error" | "info";
interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
}

interface ToastState {
    toasts: Toast[];
    push: (kind: ToastKind, message: string) => void;
    dismiss: (id: number) => void;
}

const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    push: (kind, message) => {
        const id = Date.now() + Math.random();
        set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
    },
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
    success: (m: string) => useToastStore.getState().push("success", m),
    error: (m: string) => useToastStore.getState().push("error", m),
    info: (m: string) => useToastStore.getState().push("info", m),
};

const icons = {
    success: <CheckCircle2 size={16} className="text-emerald-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-accent" />,
};

export function Toaster() {
    const { toasts, dismiss } = useToastStore();
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-border bg-elevated px-3.5 py-2.5 text-[13px] shadow-2xl"
                        initial={{ opacity: 0, x: 24, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 24, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => dismiss(t.id)}
                    >
                        {icons[t.kind]}
                        <span className="max-w-xs">{t.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
