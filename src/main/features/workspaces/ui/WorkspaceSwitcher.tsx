import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Crown, Plus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/core/http/http-client";
import { Button } from "@/main/common/ui/Button";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { Input } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { toast } from "@/main/common/ui/toast";
import { cn } from "@/main/common/utils/cn";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useWorkspaces } from "./useWorkspaces";

export function WorkspaceSwitcher() {
    // Switching and creating live here in the sidebar; managing a workspace
    // (rename, members, invitations, delete) lives in the Settings screen so the
    // request tree stays uncluttered.
    const { workspaces, activeId, setActive, active, create } = useWorkspaces();
    const current = active();
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    const openCreate = () => {
        setName("");
        setCreateOpen(true);
        setOpen(false);
    };

    const submit = async () => {
        const value = name.trim();
        if (!value) return;
        setBusy(true);
        try {
            await create(value);
            toast.success(`Created “${value}”`);
            setCreateOpen(false);
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Something went wrong");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="relative px-2.5 pt-2.5" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-elevated px-2.5 py-2 text-left transition-colors hover:border-subtle ring-accent"
                {...tourAnchor(ANCHORS.workspaceSwitcher)}
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[12px] font-bold text-accent">
                    {current?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-fg">
                        {current?.name ?? "No workspace"}
                    </span>
                    <span className="block text-[10.5px] capitalize text-subtle">
                        {current ? `${current.role}${current.is_personal ? " · personal" : ""}` : ""}
                    </span>
                </span>
                <ChevronDown size={15} className="shrink-0 text-subtle" />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute left-2.5 right-2.5 z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                        initial={{ opacity: 0, scale: 0.98, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                    >
                        <div className="max-h-60 overflow-y-auto">
                            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                                Workspaces
                            </p>
                            {workspaces.map((w) => (
                                <button
                                    key={w.id}
                                    onClick={() => {
                                        setActive(w.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-surface",
                                        w.id === activeId ? "text-fg" : "text-muted",
                                    )}
                                >
                                    <span className="min-w-0 flex-1 truncate text-left">{w.name}</span>
                                    {w.is_personal && <Crown size={11} className="shrink-0 text-amber-400/70" />}
                                    {w.id === activeId && <Check size={14} className="shrink-0 text-accent" />}
                                </button>
                            ))}
                        </div>

                        <div className="my-1 h-px bg-border" />

                        <button
                            onClick={() => {
                                setOpen(false);
                                useSettingsScreen.getState().show("workspace");
                            }}
                            disabled={!current}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-fg hover:bg-surface disabled:opacity-40"
                        >
                            <Settings size={14} /> Workspace settings
                        </button>
                        <button
                            onClick={openCreate}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-fg hover:bg-surface"
                        >
                            <Plus size={14} /> New workspace
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New workspace"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={submit} disabled={busy || !name.trim()}>
                            Create
                        </Button>
                    </>
                }
            >
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submit()}
                    placeholder="Workspace name"
                    autoFocus
                />
            </Modal>
        </div>
    );
}
