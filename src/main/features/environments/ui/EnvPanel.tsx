// A persistent panel (sits right after the collections sidebar) that always
// shows the active environment's variables, so you can see what's in scope.
// Inline editing autosaves; it stays live with "save to environment" and
// scripts because it reads the same store.
import { ChevronsLeft, ChevronsRight, Layers, Plus, Settings2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLayout } from "@/main/common/ui/useLayout";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Checkbox, Select } from "@/main/common/ui/Field";
import { VariantChips } from "@/main/common/ui/VariantChips";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import type { EnvVariable } from "../domain/models";
import { EnvironmentEditor } from "./EnvironmentEditor";
import { useEnvironments } from "./useEnvironments";

export function EnvPanel() {
    const { environments, activeId, getActive, setActive, save, create } = useEnvironments();
    const active = getActive();
    const { varsCollapsed, toggleVars } = useLayout();
    const [editorOpen, setEditorOpen] = useState(false);
    const [vars, setVars] = useState<EnvVariable[]>(active?.variables ?? []);
    const focused = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const varsKey = JSON.stringify(active?.variables ?? []);
    // Resync from the store on env switch or external change - but not while the
    // user is actively editing a field here.
    useEffect(() => {
        if (!focused.current) setVars(active?.variables ?? []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId, varsKey]);

    const commit = (rows: EnvVariable[]) => {
        const cur = useEnvironments.getState().getActive();
        if (cur) void save({ ...cur, variables: rows.filter((v) => v.key.trim() !== "") });
    };
    const scheduleCommit = (rows: EnvVariable[]) => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => commit(rows), 500);
    };
    const update = (i: number, patch: Partial<EnvVariable>) => {
        const next = vars.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
        setVars(next);
        scheduleCommit(next);
    };
    const removeRow = (i: number) => {
        const next = vars.filter((_, idx) => idx !== i);
        setVars(next);
        commit(next);
    };
    // Quick-pick a variant for a "selected" var: commit immediately (no debounce)
    // since it's a discrete choice, not typing.
    const pickVariant = (i: number, value: string) => {
        const next = vars.map((r, idx) => (idx === i ? { ...r, value } : r));
        setVars(next);
        commit(next);
    };

    if (varsCollapsed) {
        return (
            <div className="flex w-9 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-2.5">
                <IconButton label="Show variables" onClick={toggleVars}>
                    <ChevronsRight size={16} />
                </IconButton>
                <div className="mt-1 rotate-180 text-[11px] font-semibold uppercase tracking-wider text-subtle [writing-mode:vertical-rl]">
                    Variables
                </div>
            </div>
        );
    }

    return (
        <aside
            className="flex w-[256px] shrink-0 flex-col border-r border-border bg-surface"
            {...tourAnchor(ANCHORS.envPanel)}
        >
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle">
                    <Layers size={13} className="text-accent" /> Variables
                </div>
                <div className="flex items-center gap-0.5">
                    {active && (
                        <IconButton label="Edit environment" onClick={() => setEditorOpen(true)}>
                            <Settings2 size={14} />
                        </IconButton>
                    )}
                    <IconButton label="Collapse" onClick={toggleVars}>
                        <ChevronsLeft size={15} />
                    </IconButton>
                </div>
            </div>

            <div className="px-3 pb-2">
                {environments.length === 0 ? (
                    <Button
                        variant="subtle"
                        size="sm"
                        className="w-full"
                        leftIcon={<Plus size={14} />}
                        onClick={async () => {
                            const e = await create("Environment 1");
                            setActive(e.id);
                        }}
                    >
                        New environment
                    </Button>
                ) : (
                    <Select
                        value={activeId ?? ""}
                        onChange={(e) => setActive(e.target.value || null)}
                        className="h-8 text-[13px]"
                    >
                        <option value="">No environment</option>
                        {environments.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name}
                            </option>
                        ))}
                    </Select>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {!active ? (
                    <p className="px-2 py-2 text-[12px] text-subtle">
                        Pick or create an environment to manage its variables.
                    </p>
                ) : (
                    <>
                        {vars.map((v, i) => (
                            <div
                                key={i}
                                className="group mb-1 rounded-lg border border-transparent px-1.5 py-1 hover:border-border hover:bg-elevated"
                            >
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        checked={v.enabled}
                                        onChange={(e) => update(i, { enabled: e.target.checked })}
                                    />
                                    <input
                                        value={v.key}
                                        onChange={(e) => update(i, { key: e.target.value })}
                                        onFocus={() => (focused.current = true)}
                                        onBlur={() => {
                                            focused.current = false;
                                            commit(vars);
                                        }}
                                        placeholder="KEY"
                                        className="mono w-full bg-transparent text-[12px] font-medium text-fg outline-none placeholder:text-subtle"
                                    />
                                    {v.type === "selected" && (
                                        <span
                                            className="shrink-0 rounded bg-accent/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-accent"
                                            title="Selected variant - manage options in the editor"
                                        >
                                            sel
                                        </span>
                                    )}
                                    <IconButton
                                        label="Remove"
                                        className="opacity-0 group-hover:opacity-100"
                                        onClick={() => removeRow(i)}
                                    >
                                        <Trash2 size={12} />
                                    </IconButton>
                                </div>
                                {v.type === "selected" ? (
                                    (v.options ?? []).filter((o) => o.trim() !== "").length ? (
                                        <VariantChips
                                            options={v.options ?? []}
                                            value={v.value}
                                            onPick={(value) => pickVariant(i, value)}
                                            className="mt-1 pl-5"
                                        />
                                    ) : (
                                        <p className="mt-0.5 pl-5 text-[11px] italic text-subtle">
                                            No variants - add them in the editor.
                                        </p>
                                    )
                                ) : (
                                    <input
                                        value={v.value}
                                        onChange={(e) => update(i, { value: e.target.value })}
                                        onFocus={() => (focused.current = true)}
                                        onBlur={() => {
                                            focused.current = false;
                                            commit(vars);
                                        }}
                                        placeholder="value"
                                        className="mono mt-0.5 w-full bg-transparent pl-5 text-[12px] text-muted outline-none placeholder:text-subtle"
                                    />
                                )}
                            </div>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1 w-full justify-start"
                            leftIcon={<Plus size={14} />}
                            onClick={() => setVars((v) => [...v, { key: "", value: "", enabled: true }])}
                        >
                            Add variable
                        </Button>
                    </>
                )}
            </div>

            <EnvironmentEditor open={editorOpen} onClose={() => setEditorOpen(false)} />
        </aside>
    );
}
