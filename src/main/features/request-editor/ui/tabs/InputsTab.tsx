// "Inputs" tab - declares the request's overridable parameters (its signature).
// Declared params are just variables at a higher priority; inside the request
// they're used as ordinary {{name}}. On Send a run form prompts for them.
import { ListPlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, Fragment } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { Checkbox, Input } from "@/main/common/ui/Field";
import { OptionsEditor } from "@/main/common/ui/OptionsEditor";
import { VariantChips } from "@/main/common/ui/VariantChips";
import { VarNameInput } from "@/main/common/ui/VarNameInput";
import { cn } from "@/main/common/utils/cn";
import { emptyParam, type HttpRequest, type RequestParam } from "../../domain/models";
import { getForceParams, setForceParams } from "../runPrefs";
import { useVariableNames } from "@/main/features/environments/ui/useEnvironments";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

export function InputsTab({ request, update }: Props) {
    const params = request.parameters ?? [];
    const varNames = useVariableNames();
    const set = (next: RequestParam[]) => update({ parameters: next });
    const edit = (i: number, patch: Partial<RequestParam>) =>
        set(params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

    const [force, setForce] = useState(() => getForceParams(request.id));
    useEffect(() => setForce(getForceParams(request.id)), [request.id]);
    const toggleForce = (v: boolean) => {
        setForce(v);
        setForceParams(request.id, v);
    };

    // Which rows have their preset-variants editor expanded.
    const [open, setOpen] = useState<Set<number>>(new Set());
    useEffect(() => setOpen(new Set()), [request.id]);
    const toggleOpen = (i: number) =>
        setOpen((s) => {
            const next = new Set(s);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });

    return (
        <div className="space-y-3 p-4">
            <p className="text-[12px] text-subtle">
                Declared parameters are overridable variables. Use them inside the request as{" "}
                <code className="mono">{"{{name}}"}</code>; on <span className="text-fg">Send</span> you'll be prompted
                to fill them (defaults pre-filled, required marked).
            </p>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-muted">
                <Checkbox checked={force} onChange={(e) => toggleForce(e.target.checked)} />
                Always show run form before sending
                <span className="text-subtle">(otherwise sends straight away when every parameter has a default)</span>
            </label>

            {params.length === 0 ? (
                <Button variant="subtle" size="sm" leftIcon={<Plus size={14} />} onClick={() => set([emptyParam()])}>
                    Add parameter
                </Button>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                    <div className="flex border-b border-border bg-surface text-[11px] font-medium uppercase tracking-wide text-subtle">
                        <span className="flex-1 px-2.5 py-1.5">Name</span>
                        <span className="flex-1 border-l border-border px-2.5 py-1.5">Default</span>
                        <span className="flex-1 border-l border-border px-2.5 py-1.5">Description</span>
                        <span className="w-16 shrink-0 border-l border-border px-2 py-1.5 text-center">Req.</span>
                        <span
                            className="w-10 shrink-0 border-l border-border px-2 py-1.5 text-center"
                            title="Preset variants"
                        >
                            Var.
                        </span>
                        <span className="w-8 shrink-0" />
                    </div>
                    {params.map((p, i) => {
                        const variantCount = (p.options ?? []).filter((o) => o.trim() !== "").length;
                        const isOpen = open.has(i);
                        return (
                            <Fragment key={i}>
                                <div className="flex items-center border-b border-border">
                                    <VarNameInput
                                        names={varNames}
                                        value={p.name}
                                        onChange={(e) => edit(i, { name: e.target.value })}
                                        placeholder="name"
                                        className="mono h-9 flex-1 rounded-none border-0 bg-transparent px-2.5 focus:ring-0"
                                    />
                                    <HighlightedInput
                                        value={p.default}
                                        // A parameter with a default is optional, so entering one clears
                                        // the required flag automatically.
                                        onChange={(v) =>
                                            edit(i, v.trim() ? { default: v, required: false } : { default: v })
                                        }
                                        placeholder="default or {{var}}"
                                        wrapperClassName="h-9 flex-1 border-l border-border"
                                        textClassName="px-2.5 mono text-[13px]"
                                    />
                                    <Input
                                        value={p.description}
                                        onChange={(e) => edit(i, { description: e.target.value })}
                                        placeholder="description"
                                        className="h-9 flex-1 rounded-none border-0 border-l border-border bg-transparent px-2.5 text-[13px] focus:ring-0"
                                    />
                                    <div className="flex w-16 shrink-0 justify-center border-l border-border">
                                        <Checkbox
                                            checked={p.required}
                                            onChange={(e) => edit(i, { required: e.target.checked })}
                                        />
                                    </div>
                                    <div className="flex w-10 shrink-0 justify-center border-l border-border">
                                        <button
                                            onClick={() => toggleOpen(i)}
                                            title={
                                                variantCount
                                                    ? `${variantCount} preset variant(s)`
                                                    : "Add preset variants"
                                            }
                                            className={cn(
                                                "flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] transition-colors",
                                                isOpen || variantCount ? "text-accent" : "text-subtle hover:text-fg",
                                            )}
                                        >
                                            <ListPlus size={14} />
                                            {variantCount > 0 && <span className="mono">{variantCount}</span>}
                                        </button>
                                    </div>
                                    <div className="flex w-8 shrink-0 justify-center">
                                        <IconButton
                                            label="Remove"
                                            onClick={() => set(params.filter((_, idx) => idx !== i))}
                                        >
                                            <Trash2 size={13} />
                                        </IconButton>
                                    </div>
                                </div>
                                {isOpen && (
                                    <div className="space-y-2.5 border-b border-border bg-bg/40 px-3 py-2.5">
                                        <div>
                                            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
                                                Preset variants{" "}
                                                <span className="text-subtle/70">
                                                    · quick-picked in the run form and flow calls
                                                </span>
                                            </div>
                                            <OptionsEditor
                                                options={p.options ?? []}
                                                onChange={(options) => edit(i, { options })}
                                                placeholder="value or {{var}}"
                                            />
                                        </div>
                                        {variantCount > 0 && (
                                            <div>
                                                <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
                                                    Active default{" "}
                                                    <span className="text-subtle/70">
                                                        · used unless overridden on Send
                                                    </span>
                                                </div>
                                                <VariantChips
                                                    options={p.options ?? []}
                                                    value={p.default}
                                                    onPick={(v) => edit(i, { default: v, required: false })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            )}

            {params.length > 0 && (
                <button
                    onClick={() => set([...params, emptyParam()])}
                    className="flex items-center gap-1 px-1 text-[13px] text-subtle hover:text-fg"
                >
                    <Plus size={14} /> Add parameter
                </button>
            )}
        </div>
    );
}
