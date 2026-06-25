// Scripts tab: a Pre/Post toggle, each with two independent sub-tabs - a visual
// "Blocks" builder and a hand-written "Code" editor. Both run for that stage.
// The block editor has session undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) covering
// add / remove / param edits / drag-and-drop.
import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { cn } from "@/main/common/utils/cn";
import { BlocksEditor } from "@/main/features/scripting/ui/BlocksEditor";
import { CodeEditor } from "@/main/features/scripting/ui/CodeEditor";
import type { Block } from "@/main/features/scripting/domain/blocks";
import { useRequestEditor } from "../useRequestEditor";
import type { HttpRequest, ScriptStage } from "../../domain/models";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

type Phase = "pre" | "post";
type Pane = "blocks" | "code";

const COALESCE_MS = 450;

export function ScriptsTab({ request, update }: Props) {
    const [phase, setPhase] = useState<Phase>("post");
    const [pane, setPane] = useState<Pane>("blocks");
    const stage = request.scripts[phase];
    const responseJson = useRequestEditor((s) => s.response?.json);

    const setStage = (patch: Partial<ScriptStage>) =>
        update({ scripts: { ...request.scripts, [phase]: { ...stage, ...patch } } });

    // ---- block editor undo/redo (session only, per stage) ----
    const blocksRef = useRef(stage.blocks);
    blocksRef.current = stage.blocks;
    const lastEditTs = useRef(0);
    const [past, setPast] = useState<Block[][]>([]);
    const [future, setFuture] = useState<Block[][]>([]);

    // applying blocks goes through the store so undo/redo never use a stale ref
    const applyBlocks = (blocks: Block[]) => {
        const r = useRequestEditor.getState().request;
        if (!r) return;
        useRequestEditor.getState().setStage(phase, { ...r.scripts[phase], blocks });
    };

    // reset history when the edited stage changes
    useEffect(() => {
        setPast([]);
        setFuture([]);
        lastEditTs.current = 0;
    }, [phase]);

    const onBlocksChange = (next: Block[]) => {
        const now = Date.now();
        if (now - lastEditTs.current > COALESCE_MS) {
            setPast((p) => [...p, blocksRef.current]);
            setFuture([]);
        }
        lastEditTs.current = now;
        applyBlocks(next);
    };
    const undo = () => {
        if (!past.length) return;
        const prev = past[past.length - 1];
        setPast((p) => p.slice(0, -1));
        setFuture((f) => [blocksRef.current, ...f]);
        lastEditTs.current = 0;
        applyBlocks(prev);
    };
    const redo = () => {
        if (!future.length) return;
        const next = future[0];
        setFuture((f) => f.slice(1));
        setPast((p) => [...p, blocksRef.current]);
        lastEditTs.current = 0;
        applyBlocks(next);
    };

    useEffect(() => {
        if (pane !== "blocks") return;
        const onKey = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return; // let native text undo win
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pane, phase, past, future]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                    {(["pre", "post"] as Phase[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPhase(p)}
                            className={cn(
                                "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
                                phase === p ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg",
                            )}
                        >
                            {p === "pre" ? "Pre-request" : "Post-response"}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {pane === "blocks" && (
                        <div className="flex items-center gap-0.5">
                            <IconButton
                                label="Undo (Ctrl/Cmd+Z)"
                                onClick={undo}
                                className={cn(!past.length && "pointer-events-none opacity-30")}
                            >
                                <Undo2 size={15} />
                            </IconButton>
                            <IconButton
                                label="Redo (Ctrl/Cmd+Shift+Z)"
                                onClick={redo}
                                className={cn(!future.length && "pointer-events-none opacity-30")}
                            >
                                <Redo2 size={15} />
                            </IconButton>
                        </div>
                    )}
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                        {(["blocks", "code"] as Pane[]).map((pn) => (
                            <button
                                key={pn}
                                onClick={() => setPane(pn)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-[13px] font-medium capitalize transition-colors",
                                    pane === pn ? "bg-accent text-white" : "text-muted hover:text-fg",
                                )}
                            >
                                {pn}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="mb-3 text-[12px] text-subtle">
                    {phase === "pre"
                        ? "Runs before the request is sent - set variables or prepare auth."
                        : "Runs after the response arrives - capture values into your environment."}
                </p>
                {pane === "blocks" ? (
                    <BlocksEditor blocks={stage.blocks} onChange={onBlocksChange} responseJson={responseJson} />
                ) : (
                    <CodeEditor value={stage.code} onChange={(code) => setStage({ code })} minHeight={260} />
                )}
            </div>
        </div>
    );
}
