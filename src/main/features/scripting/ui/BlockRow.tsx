// Editor for a single block. Container blocks (condition, withVars) nest
// children via BlocksEditor. Expression fields offer a path|jmespath toggle and
// a "test on last response" affordance.
import { ChevronRight, GripVertical, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { evaluate } from "@/core/expression";
import { valueToString } from "@/core/json-path";
import type { Json } from "@/core/types";
import { IconButton } from "@/main/common/ui/Button";
import { Input, Select } from "@/main/common/ui/Field";
import { VarNameInput } from "@/main/common/ui/VarNameInput";
import { cn } from "@/main/common/utils/cn";
import { useEnvironments, useVariableNames } from "@/main/features/environments/ui/useEnvironments";
import { variantOptions } from "@/main/features/environments/domain/use-cases";
import {
    ASSERT_KIND_LABELS,
    ASSERT_OP_LABELS,
    OPERATOR_LABELS,
    SOURCE_LABELS,
    type AssertBlock,
    type AssertKind,
    type AssertOp,
    type AuthOverride,
    type Block,
    type ConditionBlock,
    type ConditionOp,
    type ConditionSource,
    type ExprMode,
    type SetAuthBlock,
    type SetEnvBlock,
    type WithVarsBlock,
} from "../domain/blocks";
import { BlocksEditor } from "./BlocksEditor";

interface BlockRowProps {
    block: Block;
    onChange: (block: Block) => void;
    onRemove: () => void;
    responseJson?: unknown;
    dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

const accent: Record<Block["type"], string> = {
    condition: "border-l-violet-400/60",
    withVars: "border-l-fuchsia-400/60",
    saveToEnv: "border-l-accent/70",
    setEnv: "border-l-blue-400/60",
    setAuth: "border-l-amber-400/60",
    assert: "border-l-emerald-400/60",
    log: "border-l-subtle",
};

function ModeToggle({ mode, onChange }: { mode: ExprMode; onChange: (m: ExprMode) => void }) {
    return (
        <div className="flex items-center rounded-md border border-border bg-bg p-0.5">
            {(["path", "jmespath"] as ExprMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => onChange(m)}
                    className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                        mode === m ? "bg-elevated text-fg" : "text-subtle hover:text-fg",
                    )}
                >
                    {m}
                </button>
            ))}
        </div>
    );
}

export function BlockRow({ block, onChange, onRemove, responseJson, dragHandleProps }: BlockRowProps) {
    const environments = useEnvironments((s) => s.environments);
    const varNames = useVariableNames();
    const [preview, setPreview] = useState<string | null>(null);

    const envSelect = (envId: string | null, set: (id: string | null) => void) => (
        <Select value={envId ?? ""} onChange={(e) => set(e.target.value || null)} className="w-36">
            <option value="">Active env</option>
            {environments.map((env) => (
                <option key={env.id} value={env.id}>
                    {env.name}
                </option>
            ))}
        </Select>
    );

    const runTest = (expr: string, mode: ExprMode) => {
        if (responseJson === undefined) return setPreview("no JSON response yet - send the request first");
        const r = evaluate(expr, responseJson, mode);
        setPreview(
            r.kind === "value"
                ? valueToString(r.value as Json)
                : r.kind === "nomatch"
                  ? "(no match)"
                  : `error: ${r.message}`,
        );
    };

    return (
        <div className={cn("rounded-lg border border-border border-l-2 bg-surface", accent[block.type])}>
            <div className="flex items-start gap-2 p-2">
                <span
                    {...dragHandleProps}
                    className="mt-1.5 shrink-0 cursor-grab text-subtle hover:text-fg active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical size={14} />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                    {block.type === "condition" && <ConditionEditor block={block} onChange={onChange} />}

                    {block.type === "withVars" && <WithVarsHeader block={block} onChange={onChange} names={varNames} />}

                    {block.type === "saveToEnv" && (
                        <>
                            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                                <span className="text-muted">Save</span>
                                <Input
                                    value={block.displayPath}
                                    onChange={(e) => onChange({ ...block, displayPath: e.target.value })}
                                    placeholder="data.id"
                                    className="mono w-44"
                                />
                                <ModeToggle
                                    mode={block.mode ?? "path"}
                                    onChange={(m) => onChange({ ...block, mode: m })}
                                />
                                <IconButton
                                    label="Test on last response"
                                    onClick={() => runTest(block.displayPath, block.mode ?? "path")}
                                >
                                    <Play size={13} />
                                </IconButton>
                                <span className="text-muted">to</span>
                                <VarNameInput
                                    names={varNames}
                                    value={block.variable}
                                    onChange={(e) => onChange({ ...block, variable: e.target.value })}
                                    placeholder="variable"
                                    className="mono w-36"
                                />
                                {envSelect(block.envId, (id) => onChange({ ...block, envId: id }))}
                            </div>
                            {preview !== null && <PreviewLine text={preview} />}
                        </>
                    )}

                    {block.type === "setEnv" && <SetEnvBlockEditor block={block} onChange={onChange} />}

                    {block.type === "setAuth" && <SetAuthEditor block={block} onChange={onChange} />}

                    {block.type === "assert" && (
                        <>
                            <AssertEditor block={block} onChange={onChange} onTest={runTest} />
                            {preview !== null && <PreviewLine text={preview} />}
                        </>
                    )}

                    {block.type === "log" && (
                        <div className="flex items-center gap-2 text-[13px]">
                            <span className="text-muted">Log</span>
                            <Input
                                value={block.message}
                                onChange={(e) => onChange({ ...block, message: e.target.value })}
                                placeholder="message or {{var}}"
                                className="flex-1"
                            />
                        </div>
                    )}
                </div>
                <IconButton label="Remove block" onClick={onRemove}>
                    <Trash2 size={14} />
                </IconButton>
            </div>

            {block.type === "condition" && (
                <Container label="then">
                    <BlocksEditor
                        blocks={block.children}
                        onChange={(children) => onChange({ ...block, children })}
                        nested
                        responseJson={responseJson}
                        containerId={block.id}
                    />
                </Container>
            )}
            {block.type === "withVars" && (
                <Container label="with">
                    <BlocksEditor
                        blocks={block.children}
                        onChange={(children) => onChange({ ...block, children })}
                        nested
                        responseJson={responseJson}
                        containerId={block.id}
                    />
                </Container>
            )}
        </div>
    );
}

function Container({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="ml-4 border-l border-border pb-2 pl-3 pr-2">
            <div className="mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-subtle">
                <ChevronRight size={12} /> {label}
            </div>
            {children}
        </div>
    );
}

function PreviewLine({ text }: { text: string }) {
    return (
        <div className="mono rounded bg-bg px-2 py-1 text-[12px] text-accent">
            {"->"} {text.length > 120 ? text.slice(0, 120) + "…" : text}
        </div>
    );
}

function ConditionEditor({ block, onChange }: { block: ConditionBlock; onChange: (b: Block) => void }) {
    const needsPath = block.source === "body" || block.source === "header" || block.source === "env";
    const needsValue = block.operator !== "exists";
    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">If</span>
            <Select
                value={block.source}
                onChange={(e) => onChange({ ...block, source: e.target.value as ConditionSource })}
                className="w-32"
            >
                {(Object.keys(SOURCE_LABELS) as ConditionSource[]).map((s) => (
                    <option key={s} value={s}>
                        {SOURCE_LABELS[s]}
                    </option>
                ))}
            </Select>
            {needsPath && (
                <Input
                    value={block.path}
                    onChange={(e) => onChange({ ...block, path: e.target.value })}
                    placeholder={
                        block.source === "body" ? "data.id" : block.source === "header" ? "content-type" : "var"
                    }
                    className="mono w-36"
                />
            )}
            {block.source === "body" && (
                <ModeToggle mode={block.mode ?? "path"} onChange={(m) => onChange({ ...block, mode: m })} />
            )}
            <Select
                value={block.operator}
                onChange={(e) => onChange({ ...block, operator: e.target.value as ConditionOp })}
                className="w-36"
            >
                {(Object.keys(OPERATOR_LABELS) as ConditionOp[]).map((op) => (
                    <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                    </option>
                ))}
            </Select>
            {needsValue && (
                <Input
                    value={block.value}
                    onChange={(e) => onChange({ ...block, value: e.target.value })}
                    placeholder="200"
                    className="mono w-24"
                />
            )}
        </div>
    );
}

function WithVarsHeader({
    block,
    onChange,
    names,
}: {
    block: WithVarsBlock;
    onChange: (b: Block) => void;
    names: string[];
}) {
    const set = (i: number, patch: Partial<{ name: string; value: string }>) =>
        onChange({ ...block, overrides: block.overrides.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
    return (
        <div className="space-y-1.5">
            <span className="text-[13px] text-muted">Temporarily override (for the blocks inside):</span>
            {block.overrides.map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                    <VarNameInput
                        names={names}
                        value={o.name}
                        onChange={(e) => set(i, { name: e.target.value })}
                        placeholder="variable"
                        className="mono w-36"
                    />
                    <span className="text-muted">=</span>
                    <Input
                        value={o.value}
                        onChange={(e) => set(i, { value: e.target.value })}
                        placeholder="value or {{var}}"
                        className="mono w-44"
                    />
                    <IconButton
                        label="Remove"
                        onClick={() => onChange({ ...block, overrides: block.overrides.filter((_, idx) => idx !== i) })}
                    >
                        <Trash2 size={13} />
                    </IconButton>
                </div>
            ))}
            <button
                onClick={() => onChange({ ...block, overrides: [...block.overrides, { name: "", value: "" }] })}
                className="flex items-center gap-1 text-[12px] text-subtle hover:text-fg"
            >
                <Plus size={12} /> override
            </button>
        </div>
    );
}

// Set-env block editor. When the named variable resolves (in its target env) to
// a "selectable" one, the value becomes a variant picker so it can't be set
// off-list; otherwise it's free text. New names create raw variables.
function SetEnvBlockEditor({ block, onChange }: { block: SetEnvBlock; onChange: (b: Block) => void }) {
    const environments = useEnvironments((s) => s.environments);
    const activeId = useEnvironments((s) => s.activeId);
    const allNames = useVariableNames();

    const targetEnv = environments.find((e) => e.id === (block.envId ?? activeId)) ?? null;
    const targetVar = targetEnv?.variables.find((v) => v.key === block.variable.trim());
    const options = variantOptions(targetVar);
    const isSelected = targetVar?.type === "selected" && options.length > 0;
    const names = targetEnv ? targetEnv.variables.map((v) => v.key).filter(Boolean) : allNames;

    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Set</span>
            <VarNameInput
                names={names}
                value={block.variable}
                onChange={(e) => onChange({ ...block, variable: e.target.value })}
                placeholder="variable"
                className="mono w-36"
            />
            <span className="text-muted">=</span>
            {isSelected ? (
                <>
                    <Select
                        value={options.includes(block.value) ? block.value : ""}
                        onChange={(e) => onChange({ ...block, value: e.target.value })}
                        className="w-44"
                    >
                        <option value="" disabled>
                            - choose variant -
                        </option>
                        {options.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </Select>
                    <span
                        className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"
                        title="Selectable variable - only its variants are allowed"
                    >
                        selectable
                    </span>
                </>
            ) : (
                <Input
                    value={block.value}
                    onChange={(e) => onChange({ ...block, value: e.target.value })}
                    placeholder="value or {{var}}"
                    className="mono w-44"
                />
            )}
            <Select
                value={block.envId ?? ""}
                onChange={(e) => onChange({ ...block, envId: e.target.value || null })}
                className="w-36"
            >
                <option value="">Active env</option>
                {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                        {env.name}
                    </option>
                ))}
            </Select>
        </div>
    );
}

function SetAuthEditor({ block, onChange }: { block: SetAuthBlock; onChange: (b: Block) => void }) {
    const a = block.auth;
    const set = (patch: Partial<AuthOverride>) => onChange({ ...block, auth: { ...a, ...patch } });
    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Set auth</span>
            <Select
                value={a.type}
                onChange={(e) => set({ type: e.target.value as AuthOverride["type"] })}
                className="w-28"
            >
                <option value="none">none</option>
                <option value="bearer">bearer</option>
                <option value="basic">basic</option>
                <option value="apikey">api key</option>
            </Select>
            {a.type === "bearer" && (
                <Input
                    value={a.token}
                    onChange={(e) => set({ token: e.target.value })}
                    placeholder="{{token}}"
                    className="mono w-52"
                />
            )}
            {a.type === "basic" && (
                <>
                    <Input
                        value={a.username}
                        onChange={(e) => set({ username: e.target.value })}
                        placeholder="user"
                        className="mono w-28"
                    />
                    <Input
                        value={a.password}
                        onChange={(e) => set({ password: e.target.value })}
                        placeholder="pass"
                        className="mono w-28"
                    />
                </>
            )}
            {a.type === "apikey" && (
                <>
                    <Input
                        value={a.api_key_name}
                        onChange={(e) => set({ api_key_name: e.target.value })}
                        placeholder="X-API-Key"
                        className="mono w-32"
                    />
                    <Input
                        value={a.key}
                        onChange={(e) => set({ key: e.target.value })}
                        placeholder="{{key}}"
                        className="mono w-32"
                    />
                    <Select
                        value={a.add_to}
                        onChange={(e) => set({ add_to: e.target.value as "header" | "query" })}
                        className="w-24"
                    >
                        <option value="header">header</option>
                        <option value="query">query</option>
                    </Select>
                </>
            )}
        </div>
    );
}

type BodyMode = "contains" | "regex" | "isJson" | "equalsJson";
function bodyModeOf(b: AssertBlock): BodyMode {
    if (b.op === "regex") return "regex";
    if (b.value === "__isJson") return "isJson";
    if (b.op === "eq") return "equalsJson";
    return "contains";
}

function AssertEditor({
    block,
    onChange,
    onTest,
}: {
    block: AssertBlock;
    onChange: (b: Block) => void;
    onTest: (expr: string, mode: ExprMode) => void;
}) {
    const set = (patch: Partial<AssertBlock>) => onChange({ ...block, ...patch });
    const jsonOps: AssertOp[] = ["exists", "eq", "neq", "lt", "gt", "contains", "regex", "isType"];
    const headerOps: AssertOp[] = ["exists", "eq", "contains"];

    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">Assert</span>
                <Select
                    value={block.kind}
                    onChange={(e) => set({ kind: e.target.value as AssertKind })}
                    className="w-32"
                >
                    {(Object.keys(ASSERT_KIND_LABELS) as AssertKind[]).map((k) => (
                        <option key={k} value={k}>
                            {ASSERT_KIND_LABELS[k]}
                        </option>
                    ))}
                </Select>

                {block.kind === "status" && (
                    <Input
                        value={block.value}
                        onChange={(e) => set({ value: e.target.value })}
                        placeholder="200 · 2xx · 200,201"
                        className="mono w-40"
                    />
                )}
                {block.kind === "time" && (
                    <>
                        <span className="text-muted">&lt;</span>
                        <Input
                            value={block.value}
                            onChange={(e) => set({ value: e.target.value })}
                            placeholder="500"
                            className="mono w-20"
                        />
                        <span className="text-muted">ms</span>
                    </>
                )}
                {block.kind === "json" && (
                    <>
                        <Input
                            value={block.expr}
                            onChange={(e) => set({ expr: e.target.value })}
                            placeholder="data.id"
                            className="mono w-36"
                        />
                        <ModeToggle mode={block.mode ?? "path"} onChange={(m) => set({ mode: m })} />
                        <IconButton
                            label="Test on last response"
                            onClick={() => onTest(block.expr, block.mode ?? "path")}
                        >
                            <Play size={13} />
                        </IconButton>
                        <Select
                            value={block.op}
                            onChange={(e) => set({ op: e.target.value as AssertOp })}
                            className="w-32"
                        >
                            {jsonOps.map((op) => (
                                <option key={op} value={op}>
                                    {ASSERT_OP_LABELS[op]}
                                </option>
                            ))}
                        </Select>
                        {block.op !== "exists" && (
                            <Input
                                value={block.value}
                                onChange={(e) => set({ value: e.target.value })}
                                placeholder={block.op === "isType" ? "string" : "value"}
                                className="mono w-28"
                            />
                        )}
                    </>
                )}
                {block.kind === "header" && (
                    <>
                        <Input
                            value={block.expr}
                            onChange={(e) => set({ expr: e.target.value })}
                            placeholder="content-type"
                            className="mono w-36"
                        />
                        <Select
                            value={block.op}
                            onChange={(e) => set({ op: e.target.value as AssertOp })}
                            className="w-28"
                        >
                            {headerOps.map((op) => (
                                <option key={op} value={op}>
                                    {ASSERT_OP_LABELS[op]}
                                </option>
                            ))}
                        </Select>
                        {block.op !== "exists" && (
                            <Input
                                value={block.value}
                                onChange={(e) => set({ value: e.target.value })}
                                placeholder="value"
                                className="mono w-32"
                            />
                        )}
                    </>
                )}
                {block.kind === "body" && (
                    <>
                        <Select
                            value={bodyModeOf(block)}
                            onChange={(e) => {
                                const m = e.target.value as BodyMode;
                                if (m === "regex") set({ op: "regex", value: "" });
                                else if (m === "isJson") set({ op: "eq", value: "__isJson" });
                                else if (m === "equalsJson") set({ op: "eq", value: "" });
                                else set({ op: "contains", value: "" });
                            }}
                            className="w-36"
                        >
                            <option value="contains">contains text</option>
                            <option value="regex">matches regex</option>
                            <option value="isJson">is valid JSON</option>
                            <option value="equalsJson">equals JSON</option>
                        </Select>
                        {bodyModeOf(block) !== "isJson" && (
                            <Input
                                value={block.value}
                                onChange={(e) => set({ value: e.target.value })}
                                placeholder="expected"
                                className="mono w-40"
                            />
                        )}
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Input
                    value={block.label}
                    onChange={(e) => set({ label: e.target.value })}
                    placeholder="label (optional)"
                    className="h-7 w-52 text-[12px]"
                />
                <span className="text-subtle">on fail</span>
                <Select
                    value={block.onFail}
                    onChange={(e) => set({ onFail: e.target.value as "stop" | "continue" })}
                    className="h-7 w-24 text-[12px]"
                >
                    <option value="stop">stop</option>
                    <option value="continue">continue</option>
                </Select>
            </div>
        </div>
    );
}
