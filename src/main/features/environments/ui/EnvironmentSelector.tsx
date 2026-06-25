import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Layers, Plus, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/main/common/utils/cn";
import { useEnvironments } from "./useEnvironments";
import { EnvironmentEditor } from "./EnvironmentEditor";

export function EnvironmentSelector() {
    const { environments, activeId, setActive, getActive, create } = useEnvironments();
    const [open, setOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const active = getActive();

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    const addEnv = async () => {
        const env = await create(`Environment ${environments.length + 1}`);
        setActive(env.id);
        setOpen(false);
        setEditorOpen(true);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-fg transition-colors hover:border-subtle ring-accent"
            >
                <Layers size={14} className="text-accent" />
                <span className="max-w-[140px] truncate">{active ? active.name : "No environment"}</span>
                <ChevronDown size={14} className="text-subtle" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                    >
                        <div className="max-h-64 overflow-y-auto">
                            <button
                                onClick={() => {
                                    setActive(null);
                                    setOpen(false);
                                }}
                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface"
                            >
                                No environment
                                {!activeId && <Check size={14} className="text-accent" />}
                            </button>
                            {environments.map((env) => (
                                <button
                                    key={env.id}
                                    onClick={() => {
                                        setActive(env.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-surface",
                                        env.id === activeId ? "text-fg" : "text-muted",
                                    )}
                                >
                                    <span className="truncate">{env.name}</span>
                                    {env.id === activeId && <Check size={14} className="text-accent" />}
                                </button>
                            ))}
                        </div>
                        <div className="my-1 h-px bg-border" />
                        <button
                            onClick={addEnv}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-fg hover:bg-surface"
                        >
                            <Plus size={14} /> New environment
                        </button>
                        <button
                            onClick={() => {
                                setOpen(false);
                                setEditorOpen(true);
                            }}
                            disabled={!active}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-fg hover:bg-surface disabled:opacity-40"
                        >
                            <SlidersHorizontal size={14} /> Manage variables
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <EnvironmentEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
        </div>
    );
}
