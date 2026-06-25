// Editor for a single flow step. Compact, type-specific fields. Call/Wait pick a
// target request (live link), pass invocation args and capture values from the
// response into the flow-scope. Assert/Wait reuse the shared condition editor.
import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/main/common/ui/Button";
import { Checkbox, Input, Select } from "@/main/common/ui/Field";
import { VarNameInput } from "@/main/common/ui/VarNameInput";
import { useEnvironments, useVariableNames } from "@/main/features/environments/ui/useEnvironments";
import { variantOptions } from "@/main/features/environments/domain/use-cases";
import { IdentitySelect } from "@/main/features/identities/ui/IdentitySelect";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { VariantChips } from "@/main/common/ui/VariantChips";
import { cn } from "@/main/common/utils/cn";
import {
    ASSERT_KIND_LABELS,
    ASSERT_OP_LABELS,
    blankAuthOverride,
    type AssertKind,
    type AssertOp,
    type AuthOverride,
    type ExprMode,
} from "@/main/features/scripting/domain/blocks";
import type {
    AssertStep,
    CallArg,
    CallStep,
    Capture,
    DelayStep,
    FlowStep,
    ForEachStep,
    IfStep,
    InputStep,
    RequestParam,
    SetAuthStep,
    SetEnvStep,
    SetStep,
    WaitStep,
} from "@/main/features/request-editor/domain/models";
import { StepList } from "./StepList";
import { useRequestParams } from "./useRequestParams";
import React, { useEffect } from "react";

export interface TargetOption {
    id: string;
    label: string;
}

const accent: Record<FlowStep["type"], string> = {
    call: "border-l-violet-400/70",
    set: "border-l-blue-400/60",
    setEnv: "border-l-accent/70",
    input: "border-l-pink-400/70",
    delay: "border-l-slate-400/50",
    setAuth: "border-l-amber-400/60",
    assert: "border-l-emerald-400/60",
    wait: "border-l-cyan-400/70",
    forEach: "border-l-fuchsia-400/70",
    if: "border-l-indigo-400/70",
};

const jsonOps: AssertOp[] = ["exists", "eq", "neq", "lt", "gt", "contains", "regex", "isType"];
const headerOps: AssertOp[] = ["exists", "eq", "contains"];

function Tpl({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <HighlightedInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            wrapperClassName={cn("h-8 rounded-lg border border-border bg-bg", className)}
            textClassName="px-2.5 mono text-[13px]"
        />
    );
}

function ModeToggle({ mode, onChange }: { mode: ExprMode; onChange: (m: ExprMode) => void }) {
    return (
        <div className="flex items-center rounded-md border border-border bg-bg p-0.5">
            {(["path", "jmespath"] as ExprMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => onChange(m)}
                    className={cn(
                        "rounded px-1.5 py-0.5 text-[11px] font-medium",
                        mode === m ? "bg-elevated text-fg" : "text-subtle hover:text-fg",
                    )}
                >
                    {m}
                </button>
            ))}
        </div>
    );
}

function TargetSelect({
    value,
    onChange,
    targets,
}: {
    value: string;
    onChange: (id: string) => void;
    targets: TargetOption[];
}) {
    return (
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 flex-1">
            <option value="">- select a request -</option>
            {targets.map((t) => (
                <option key={t.id} value={t.id}>
                    {t.label}
                </option>
            ))}
        </Select>
    );
}

// Declared parameters of a target request (fetched + cached on demand).
function useDeclaredParams(requestId: string): RequestParam[] {
    const cached = useRequestParams((s) => (requestId ? s.byId[requestId] : undefined));
    const ensure = useRequestParams((s) => s.ensure);
    useEffect(() => {
        if (requestId) void ensure(requestId);
    }, [requestId, ensure]);
    return cached?.params ?? [];
}

// The target request's auth type (for the "auth required" pre-run warning).
function useTargetAuthType(requestId: string): string {
    const cached = useRequestParams((s) => (requestId ? s.byId[requestId] : undefined));
    return cached?.authType ?? "none";
}

// Required declared params that won't get a value at run time: no arg carries a
// non-empty value for them (a `{{var}}` reference counts as filled) and they
// aren't a known environment variable. Mirrors the runner's run-time guard so
// the editor can warn before Run.
function unfilledRequired(params: RequestParam[], args: CallArg[], envNames: Set<string>): string[] {
    const filled = new Set(args.filter((a) => a.name.trim() && a.value.trim() !== "").map((a) => a.name.trim()));
    return params
        .filter((p) => p.required && p.name && !filled.has(p.name) && !envNames.has(p.name))
        .map((p) => p.name);
}

// Args editor for a Call/Wait step, aware of the target request's declared
// parameters: it auto-fills them on first selection, suggests names, and lets
// you re-add any you removed (with required ones flagged).
function RequestArgs({
    requestId,
    value,
    onChange,
}: {
    requestId: string;
    value: CallArg[];
    onChange: (a: CallArg[]) => void;
}) {
    const params = useDeclaredParams(requestId);

    // Pre-fill the declared parameters once they're known and nothing's set yet
    // (a fresh step, or after switching the target request which clears args).
    useEffect(() => {
        if (requestId && params.length > 0 && value.length === 0) {
            onChange(params.map((p) => ({ name: p.name, value: p.default })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId, params]);

    const envNames = new Set(useVariableNames());
    const present = new Set(value.map((a) => a.name.trim()).filter(Boolean));
    const known = params.map((p) => p.name).filter(Boolean);
    // Preset variants per declared param, so args matching one get quick-pick chips.
    const optionsByName: Record<string, string[]> = Object.fromEntries(
        params.filter((p) => p.name && (p.options?.length ?? 0) > 0).map((p) => [p.name, p.options ?? []]),
    );
    const missingRequired = unfilledRequired(params, value, envNames);
    const addParam = (p: RequestParam) => {
        if (present.has(p.name)) return;
        onChange([...value, { name: p.name, value: p.default }]);
    };
    const addAllMissing = () =>
        onChange([
            ...value,
            ...params.filter((p) => p.name && !present.has(p.name)).map((p) => ({ name: p.name, value: p.default })),
        ]);

    return (
        <div>
            <div className="mb-1 flex items-center gap-2 text-[12px] text-subtle">
                <span>With parameters</span>
                {requestId && params.length > 0 && (
                    <button onClick={addAllMissing} className="text-accent hover:underline">
                        autofill
                    </button>
                )}
            </div>

            {requestId && params.length > 0 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1">
                    {params.map((p) => {
                        const used = present.has(p.name);
                        const tip = [
                            p.description,
                            p.required ? "required" : "optional",
                            used ? "already added" : "click to add",
                        ]
                            .filter(Boolean)
                            .join(" · ");
                        return (
                            <button
                                key={p.name}
                                onClick={() => addParam(p)}
                                disabled={used}
                                title={tip}
                                className={cn(
                                    "mono flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors",
                                    used
                                        ? "border-border bg-elevated text-subtle line-through opacity-60"
                                        : p.required
                                          ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                          : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
                                )}
                            >
                                {p.name || "(unnamed)"}
                                {p.required && <span className={cn(used ? "text-subtle" : "text-amber-400")}>*</span>}
                            </button>
                        );
                    })}
                    <span className="ml-1 flex items-center gap-2 text-[10px] text-subtle">
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm border border-amber-500/40 bg-amber-500/20" />{" "}
                            required
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-sm border border-accent/40 bg-accent/20" />{" "}
                            optional
                        </span>
                    </span>
                </div>
            )}

            <ArgRows value={value} onChange={onChange} suggestions={known} optionsByName={optionsByName} />

            {missingRequired.length > 0 && (
                <div className="mt-1 text-[11px] text-amber-400/90">Missing required: {missingRequired.join(", ")}</div>
            )}
        </div>
    );
}

// shared: invocation args (name=value). `suggestions` feeds name autocomplete;
// `optionsByName` adds quick-pick chips for args matching a declared param that
// carries preset variants.
function ArgRows({
    value,
    onChange,
    suggestions = [],
    optionsByName = {},
}: {
    value: CallArg[];
    onChange: (a: CallArg[]) => void;
    suggestions?: string[];
    optionsByName?: Record<string, string[]>;
}) {
    const listId = React.useId();
    const set = (i: number, patch: Partial<CallArg>) =>
        onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
    return (
        <>
            {suggestions.length > 0 && (
                <datalist id={listId}>
                    {suggestions.map((name) => (
                        <option key={name} value={name} />
                    ))}
                </datalist>
            )}
            {value.map((a, i) => {
                const opts = optionsByName[a.name.trim()];
                return (
                    <div key={i} className="mb-1">
                        <div className="flex items-center gap-2">
                            <Input
                                value={a.name}
                                onChange={(e) => set(i, { name: e.target.value })}
                                placeholder="name"
                                className="mono h-8 !w-40"
                                list={suggestions.length ? listId : undefined}
                            />
                            <span className="text-muted">=</span>
                            <Tpl
                                value={a.value}
                                onChange={(v) => set(i, { value: v })}
                                placeholder="value or {{var}}"
                                className="flex-1"
                            />
                            <IconButton label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
                                <Trash2 size={12} />
                            </IconButton>
                        </div>
                        {opts && opts.length > 0 && (
                            <VariantChips
                                options={opts}
                                value={a.value}
                                onPick={(v) => set(i, { value: v })}
                                className="ml-[3.25rem] mt-1"
                            />
                        )}
                    </div>
                );
            })}
            <button
                onClick={() => onChange([...value, { name: "", value: "" }])}
                className="flex items-center gap-1 text-[12px] text-subtle hover:text-fg"
            >
                <Plus size={12} /> parameter
            </button>
        </>
    );
}

// shared: captures (var <- expression)
function Captures({ value, onChange }: { value: Capture[]; onChange: (c: Capture[]) => void }) {
    const names = useVariableNames();
    const set = (i: number, patch: Partial<Capture>) =>
        onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    return (
        <div>
            <div className="mb-1 text-[12px] text-subtle">Capture from response</div>
            {value.map((c, i) => (
                <div key={i} className="mb-1 flex items-center gap-2">
                    <VarNameInput
                        names={names}
                        value={c.variable}
                        onChange={(e) => set(i, { variable: e.target.value })}
                        placeholder="var"
                        className="mono h-8 !w-36"
                    />
                    <span className="text-muted">{"<-"}</span>
                    <Tpl
                        value={c.expr}
                        onChange={(v) => set(i, { expr: v })}
                        placeholder="data.id"
                        className="flex-1"
                    />
                    <ModeToggle mode={c.mode} onChange={(m) => set(i, { mode: m })} />
                    <IconButton label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
                        <Trash2 size={12} />
                    </IconButton>
                </div>
            ))}
            <button
                onClick={() => onChange([...value, { variable: "", expr: "", mode: "path" }])}
                className="flex items-center gap-1 text-[12px] text-subtle hover:text-fg"
            >
                <Plus size={12} /> capture
            </button>
        </div>
    );
}

// shared: a condition over the response (status / time / json / header / body)
interface CondFields {
    kind: AssertKind;
    expr: string;
    mode: ExprMode;
    op: AssertOp;
    value: string;
}
function ConditionFields({ fields, onChange }: { fields: CondFields; onChange: (patch: Partial<CondFields>) => void }) {
    return (
        <>
            <Select
                value={fields.kind}
                onChange={(e) => {
                    const kind = e.target.value as AssertKind;
                    onChange({ kind, op: kind === "body" ? "contains" : fields.op });
                }}
                className="h-8 w-32"
            >
                {(Object.keys(ASSERT_KIND_LABELS) as AssertKind[]).map((k) => (
                    <option key={k} value={k}>
                        {ASSERT_KIND_LABELS[k]}
                    </option>
                ))}
            </Select>
            {fields.kind === "status" && (
                <Input
                    value={fields.value}
                    onChange={(e) => onChange({ value: e.target.value })}
                    placeholder="200 · 2xx · 200,201"
                    className="mono h-8 w-40"
                />
            )}
            {fields.kind === "time" && (
                <>
                    <span className="text-muted">&lt;</span>
                    <Input
                        value={fields.value}
                        onChange={(e) => onChange({ value: e.target.value })}
                        placeholder="500"
                        className="mono h-8 w-20"
                    />
                    <span className="text-muted">ms</span>
                </>
            )}
            {fields.kind === "json" && (
                <>
                    <Tpl
                        value={fields.expr}
                        onChange={(v) => onChange({ expr: v })}
                        placeholder="data.id"
                        className="w-40"
                    />
                    <ModeToggle mode={fields.mode} onChange={(m) => onChange({ mode: m })} />
                    <Select
                        value={fields.op}
                        onChange={(e) => onChange({ op: e.target.value as AssertOp })}
                        className="h-8 w-32"
                    >
                        {jsonOps.map((op) => (
                            <option key={op} value={op}>
                                {ASSERT_OP_LABELS[op]}
                            </option>
                        ))}
                    </Select>
                    {fields.op !== "exists" && (
                        <Tpl
                            value={fields.value}
                            onChange={(v) => onChange({ value: v })}
                            placeholder="value or {{var}}"
                            className="w-32"
                        />
                    )}
                </>
            )}
            {fields.kind === "header" && (
                <>
                    <Input
                        value={fields.expr}
                        onChange={(e) => onChange({ expr: e.target.value })}
                        placeholder="content-type"
                        className="mono h-8 w-40"
                    />
                    <Select
                        value={fields.op}
                        onChange={(e) => onChange({ op: e.target.value as AssertOp })}
                        className="h-8 w-28"
                    >
                        {headerOps.map((op) => (
                            <option key={op} value={op}>
                                {ASSERT_OP_LABELS[op]}
                            </option>
                        ))}
                    </Select>
                    {fields.op !== "exists" && (
                        <Tpl
                            value={fields.value}
                            onChange={(v) => onChange({ value: v })}
                            placeholder="value"
                            className="w-32"
                        />
                    )}
                </>
            )}
            {fields.kind === "body" && (
                <Tpl
                    value={fields.value}
                    onChange={(v) => onChange({ value: v })}
                    placeholder="contains text"
                    className="w-48"
                />
            )}
        </>
    );
}

export function FlowStepRow({
    step,
    index,
    onChange,
    onRemove,
    targets,
    dragHandleProps,
}: {
    step: FlowStep;
    index: number;
    onChange: (s: FlowStep) => void;
    onRemove: () => void;
    targets: TargetOption[];
    dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}) {
    const typeLabel =
        step.type === "setAuth"
            ? "set auth"
            : step.type === "setEnv"
              ? "set env"
              : step.type === "input"
                ? "ask input"
                : step.type === "wait"
                  ? "wait / poll"
                  : step.type === "forEach"
                    ? "for each"
                    : step.type;

    // Pre-run warning for Call/Poll steps whose target has required parameters we
    // can already tell won't be filled. Hooks run unconditionally; for other step
    // types the request id is empty so nothing is fetched or flagged.
    const targetRequestId = step.type === "call" || step.type === "wait" ? step.requestId : "";
    const declaredParams = useDeclaredParams(targetRequestId);
    const targetAuthType = useTargetAuthType(targetRequestId);
    const envNames = new Set(useVariableNames());
    const stepArgs = step.type === "call" || step.type === "wait" ? step.args : [];
    const unfilled = targetRequestId ? unfilledRequired(declaredParams, stepArgs, envNames) : [];
    // The target defers auth to the caller, but this Call has no per-call override
    // (Set-auth can still satisfy it at run time - hence "may be" wording).
    const authNeeded = step.type === "call" && targetAuthType === "parameter" && !step.auth;

    return (
        <div
            data-tour={`flow-step-${step.type}`}
            className={cn(
                "rounded-xl border border-l-2 bg-surface p-2.5",
                unfilled.length > 0 || authNeeded ? "border-amber-500/40" : "border-border",
                accent[step.type],
            )}
        >
            <div className="mb-1.5 flex items-center gap-2">
                <span className="mono flex h-5 w-5 shrink-0 items-center justify-center rounded bg-elevated text-[11px] text-subtle">
                    {index + 1}
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{typeLabel}</span>
                {authNeeded && (
                    <span
                        className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-400"
                        title="This request defers its auth to the caller - override auth on this Call step (or use a Set-auth step before it)."
                    >
                        <AlertTriangle size={11} /> auth required
                    </span>
                )}
                {unfilled.length > 0 && (
                    <span
                        className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-400"
                        title={`Required parameter${unfilled.length > 1 ? "s" : ""} not filled: ${unfilled.join(", ")}`}
                    >
                        <AlertTriangle size={11} /> {unfilled.join(", ")}
                    </span>
                )}
                <div className="flex-1" />
                <span
                    {...dragHandleProps}
                    className="cursor-grab text-subtle hover:text-fg active:cursor-grabbing"
                    title="Drag to reorder"
                >
                    <GripVertical size={14} />
                </span>
                <IconButton label="Remove step" onClick={onRemove}>
                    <Trash2 size={13} />
                </IconButton>
            </div>

            {step.type === "call" && <CallEditor step={step} onChange={onChange} targets={targets} />}
            {step.type === "set" && <SetEditor step={step} onChange={onChange} />}
            {step.type === "setEnv" && <SetEnvEditor step={step} onChange={onChange} />}
            {step.type === "input" && <InputEditor step={step} onChange={onChange} />}
            {step.type === "delay" && <DelayEditor step={step} onChange={onChange} />}
            {step.type === "setAuth" && <SetAuthEditor step={step} onChange={onChange} />}
            {step.type === "assert" && <AssertEditor step={step} onChange={onChange} />}
            {step.type === "wait" && <WaitEditor step={step} onChange={onChange} targets={targets} />}
            {step.type === "forEach" && <ForEachEditor step={step} onChange={onChange} targets={targets} />}
            {step.type === "if" && <IfEditor step={step} onChange={onChange} targets={targets} />}
        </div>
    );
}

function CallEditor({
    step,
    onChange,
    targets,
}: {
    step: CallStep;
    onChange: (s: FlowStep) => void;
    targets: TargetOption[];
}) {
    // Switching the target request clears its args so the new request's declared
    // parameters get auto-filled in.
    const pickRequest = (id: string) =>
        onChange({ ...step, requestId: id, args: id === step.requestId ? step.args : [] });
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[13px]">
                <span className="w-20 shrink-0 text-muted">Request</span>
                <TargetSelect value={step.requestId} onChange={pickRequest} targets={targets} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="w-20 shrink-0 text-muted">As</span>
                <Select
                    value={step.auth ? "override" : "inherit"}
                    onChange={(e) =>
                        onChange({
                            ...step,
                            auth: e.target.value === "override" ? (step.auth ?? blankAuthOverride()) : undefined,
                        })
                    }
                    className="h-8 w-40"
                >
                    <option value="inherit">Inherit auth</option>
                    <option value="override">Override…</option>
                </Select>
                {step.auth ? (
                    <AuthOverrideFields auth={step.auth} onChange={(auth) => onChange({ ...step, auth })} />
                ) : (
                    <span className="text-[12px] text-subtle">uses Set-auth or the request's own auth</span>
                )}
            </div>
            <RequestArgs
                requestId={step.requestId}
                value={step.args}
                onChange={(args) => onChange({ ...step, args })}
            />
            <Captures value={step.captures} onChange={(captures) => onChange({ ...step, captures })} />
        </div>
    );
}

function SetEditor({ step, onChange }: { step: SetStep; onChange: (s: FlowStep) => void }) {
    const names = useVariableNames();
    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Set</span>
            <VarNameInput
                names={names}
                value={step.variable}
                onChange={(e) => onChange({ ...step, variable: e.target.value })}
                placeholder="variable"
                className="mono h-8 w-40"
            />
            <span className="text-muted">=</span>
            <Tpl
                value={step.value}
                onChange={(v) => onChange({ ...step, value: v })}
                placeholder="value, {{var}} or {{$uuid}}"
                className="min-w-[12rem] flex-1"
            />
        </div>
    );
}

function SetEnvEditor({ step, onChange }: { step: SetEnvStep; onChange: (s: FlowStep) => void }) {
    const environments = useEnvironments((s) => s.environments);
    const activeId = useEnvironments((s) => s.activeId);
    const allNames = useVariableNames();

    // Resolve the variable in its target environment to learn its type. The same
    // name can be raw in one env and selectable in another, so we look it up in
    // the step's target (its chosen env, else the active one).
    const targetEnv = environments.find((e) => e.id === (step.envId ?? activeId)) ?? null;
    const targetVar = targetEnv?.variables.find((v) => v.key === step.variable.trim());
    const options = variantOptions(targetVar);
    const isSelected = targetVar?.type === "selected" && options.length > 0;
    // Autocomplete from the target env's names (fall back to every known name).
    const names = targetEnv ? targetEnv.variables.map((v) => v.key).filter(Boolean) : allNames;

    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Set env</span>
            <VarNameInput
                names={names}
                value={step.variable}
                onChange={(e) => onChange({ ...step, variable: e.target.value })}
                placeholder="variable"
                className="mono h-8 w-40"
            />
            <span className="text-muted">=</span>
            {isSelected ? (
                <>
                    <Select
                        value={options.includes(step.value) ? step.value : ""}
                        onChange={(e) => onChange({ ...step, value: e.target.value })}
                        className="h-8 min-w-[10rem] flex-1"
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
                <Tpl
                    value={step.value}
                    onChange={(v) => onChange({ ...step, value: v })}
                    placeholder="value, {{var}} or {{$uuid}}"
                    className="min-w-[12rem] flex-1"
                />
            )}
            <Select
                value={step.envId ?? ""}
                onChange={(e) => onChange({ ...step, envId: e.target.value || null })}
                className="h-8 w-36"
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

function InputEditor({ step, onChange }: { step: InputStep; onChange: (s: FlowStep) => void }) {
    const names = useVariableNames();
    const set = (patch: Partial<InputStep>) => onChange({ ...step, ...patch });
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[13px]">
                <span className="w-16 shrink-0 text-muted">Ask</span>
                <Input
                    value={step.prompt}
                    onChange={(e) => set({ prompt: e.target.value })}
                    placeholder="Prompt shown when the flow pauses (e.g. Enter the code from your email)"
                    className="h-8 flex-1"
                />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="w-16 shrink-0 text-muted">Store in</span>
                <VarNameInput
                    names={names}
                    value={step.variable}
                    onChange={(e) => set({ variable: e.target.value })}
                    placeholder="variable"
                    className="mono h-8 w-40"
                />
                <span className="text-muted">default</span>
                <Tpl
                    value={step.defaultValue}
                    onChange={(v) => set({ defaultValue: v })}
                    placeholder="optional, {{var}}"
                    className="w-40"
                />
                <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
                    <Checkbox checked={step.secret} onChange={(e) => set({ secret: e.target.checked })} /> secret
                </label>
            </div>
            <p className="text-[11px] text-subtle">The flow pauses here and resumes once you submit the value.</p>
        </div>
    );
}

function DelayEditor({ step, onChange }: { step: DelayStep; onChange: (s: FlowStep) => void }) {
    return (
        <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted">Wait</span>
            <Input
                type="number"
                value={String(step.ms)}
                onChange={(e) => onChange({ ...step, ms: Number(e.target.value) || 0 })}
                className="mono h-8 w-28"
            />
            <span className="text-muted">ms</span>
        </div>
    );
}

// Auth credential fields (type + inputs). Shared by Set-auth and per-Call auth.
function AuthOverrideFields({ auth, onChange }: { auth: AuthOverride; onChange: (a: AuthOverride) => void }) {
    const set = (patch: Partial<AuthOverride>) => onChange({ ...auth, ...patch });
    return (
        <>
            <Select
                value={auth.type}
                onChange={(e) => set({ type: e.target.value as AuthOverride["type"] })}
                className="h-8 w-28"
            >
                <option value="none">none</option>
                <option value="bearer">bearer</option>
                <option value="basic">basic</option>
                <option value="apikey">api key</option>
                <option value="identity">identity</option>
            </Select>
            {auth.type === "identity" && (
                <IdentitySelect
                    value={auth.identity_id ?? ""}
                    onChange={(id) => set({ identity_id: id })}
                    className="h-8 w-44"
                />
            )}
            {auth.type === "bearer" && (
                <Tpl value={auth.token} onChange={(v) => set({ token: v })} placeholder="{{token}}" className="w-56" />
            )}
            {auth.type === "basic" && (
                <>
                    <Tpl
                        value={auth.username}
                        onChange={(v) => set({ username: v })}
                        placeholder="user"
                        className="w-32"
                    />
                    <Tpl
                        value={auth.password}
                        onChange={(v) => set({ password: v })}
                        placeholder="pass"
                        className="w-32"
                    />
                </>
            )}
            {auth.type === "apikey" && (
                <>
                    <Tpl
                        value={auth.api_key_name}
                        onChange={(v) => set({ api_key_name: v })}
                        placeholder="X-API-Key"
                        className="w-36"
                    />
                    <Tpl value={auth.key} onChange={(v) => set({ key: v })} placeholder="{{key}}" className="w-36" />
                    <Select
                        value={auth.add_to}
                        onChange={(e) => set({ add_to: e.target.value as "header" | "query" })}
                        className="h-8 w-24"
                    >
                        <option value="header">header</option>
                        <option value="query">query</option>
                    </Select>
                </>
            )}
        </>
    );
}

function SetAuthEditor({ step, onChange }: { step: SetAuthStep; onChange: (s: FlowStep) => void }) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted">Auth</span>
            <AuthOverrideFields auth={step.auth} onChange={(auth) => onChange({ ...step, auth })} />
            <span className="text-[12px] text-subtle">applies to the following Call steps</span>
        </div>
    );
}

function AssertEditor({ step, onChange }: { step: AssertStep; onChange: (s: FlowStep) => void }) {
    const set = (patch: Partial<AssertStep>) => onChange({ ...step, ...patch });
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">Assert (last response)</span>
                <ConditionFields fields={step} onChange={set} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <Input
                    value={step.label}
                    onChange={(e) => set({ label: e.target.value })}
                    placeholder="label (optional)"
                    className="h-7 w-52 text-[12px]"
                />
                <span className="text-subtle">on fail</span>
                <Select
                    value={step.onFail}
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

function WaitEditor({
    step,
    onChange,
    targets,
}: {
    step: WaitStep;
    onChange: (s: FlowStep) => void;
    targets: TargetOption[];
}) {
    const set = (patch: Partial<WaitStep>) => onChange({ ...step, ...patch });
    const pickRequest = (id: string) => set(id === step.requestId ? { requestId: id } : { requestId: id, args: [] });
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[13px]">
                <span className="w-20 shrink-0 text-muted">Poll</span>
                <TargetSelect value={step.requestId} onChange={pickRequest} targets={targets} />
            </div>
            <RequestArgs requestId={step.requestId} value={step.args} onChange={(args) => set({ args })} />
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">Until</span>
                <ConditionFields fields={step} onChange={set} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-subtle">
                <span>every</span>
                <Input
                    type="number"
                    value={String(step.intervalMs)}
                    onChange={(e) => set({ intervalMs: Number(e.target.value) || 0 })}
                    className="mono h-7 w-20 text-[12px]"
                />
                <span>ms · up to</span>
                <Input
                    type="number"
                    value={String(step.maxAttempts)}
                    onChange={(e) => set({ maxAttempts: Number(e.target.value) || 1 })}
                    className="mono h-7 w-16 text-[12px]"
                />
                <span>tries · timeout</span>
                <Input
                    type="number"
                    value={String(step.timeoutMs)}
                    onChange={(e) => set({ timeoutMs: Number(e.target.value) || 0 })}
                    className="mono h-7 w-24 text-[12px]"
                />
                <span>ms · on timeout</span>
                <Select
                    value={step.onFail}
                    onChange={(e) => set({ onFail: e.target.value as "stop" | "continue" })}
                    className="h-7 w-24 text-[12px]"
                >
                    <option value="stop">stop</option>
                    <option value="continue">continue</option>
                </Select>
            </div>
            <Captures value={step.captures} onChange={(captures) => set({ captures })} />
        </div>
    );
}

function ChildSteps({
    steps,
    onChange,
    targets,
    containerId,
}: {
    steps: FlowStep[];
    onChange: (c: FlowStep[]) => void;
    targets: TargetOption[];
    containerId: string;
}) {
    return (
        <div className="ml-2 border-l border-border pl-3">
            <StepList steps={steps} onChange={onChange} targets={targets} nested containerId={containerId} />
        </div>
    );
}

function ForEachEditor({
    step,
    onChange,
    targets,
}: {
    step: ForEachStep;
    onChange: (s: FlowStep) => void;
    targets: TargetOption[];
}) {
    const names = useVariableNames();
    const set = (patch: Partial<ForEachStep>) => onChange({ ...step, ...patch });
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">For each</span>
                <VarNameInput
                    names={names}
                    value={step.itemVar}
                    onChange={(e) => set({ itemVar: e.target.value })}
                    placeholder="item"
                    className="mono h-8 w-28"
                />
                <span className="text-muted">in</span>
                <Tpl value={step.expr} onChange={(v) => set({ expr: v })} placeholder="data.items" className="w-44" />
                <ModeToggle mode={step.mode} onChange={(m) => set({ mode: m })} />
                <span className="text-muted">index</span>
                <VarNameInput
                    names={names}
                    value={step.indexVar}
                    onChange={(e) => set({ indexVar: e.target.value })}
                    placeholder="(optional)"
                    className="mono h-8 w-28"
                />
            </div>
            <ChildSteps
                steps={step.children}
                onChange={(children) => set({ children })}
                targets={targets}
                containerId={step.id}
            />
        </div>
    );
}

function IfEditor({
    step,
    onChange,
    targets,
}: {
    step: IfStep;
    onChange: (s: FlowStep) => void;
    targets: TargetOption[];
}) {
    const set = (patch: Partial<IfStep>) => onChange({ ...step, ...patch });
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-muted">If (last response)</span>
                <ConditionFields fields={step} onChange={set} />
            </div>
            <ChildSteps
                steps={step.children}
                onChange={(children) => set({ children })}
                targets={targets}
                containerId={step.id}
            />
        </div>
    );
}
