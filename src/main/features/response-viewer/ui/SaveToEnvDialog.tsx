// The headline dialog. Confirming it (1) appends a saveToEnv block to the
// request's post-response scripts so the field is captured on every future
// send, and (2) optionally writes the value right now from the current
// response.
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { suggestVarName, valueToString } from "@/core/json-path";
import type { Json, JsonPath } from "@/core/types";
import { Button } from "@/main/common/ui/Button";
import { Input, Label, Select } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { cn } from "@/main/common/utils/cn";
import { toast } from "@/main/common/ui/toast";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { variantOptions } from "@/main/features/environments/domain/use-cases";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { makeSaveToEnvBlock, type ExprMode } from "@/main/features/scripting/domain/blocks";

interface Props {
    open: boolean;
    onClose: () => void;
    pathSegments: JsonPath;
    displayPath: string;
    value: Json;
}

export function SaveToEnvDialog({ open, onClose, pathSegments, displayPath, value }: Props) {
    const { environments, activeId, create, setVariable } = useEnvironments();
    const addPostBlock = useRequestEditor((s) => s.addPostBlock);
    const [variable, setVariable_] = useState("");
    const [envId, setEnvId] = useState<string | null>(activeId);
    const [setNow, setSetNow] = useState(true);
    const [mode, setMode] = useState<ExprMode>("path");

    useEffect(() => {
        if (open) {
            setVariable_(suggestVarName(pathSegments));
            setEnvId(activeId);
            setSetNow(true);
            setMode("path");
        }
    }, [open, pathSegments, activeId]);

    const createEnv = async () => {
        const env = await create("Environment 1");
        setEnvId(env.id);
    };

    // A "selected" variable only accepts its predefined variants, so a captured
    // response value can't be saved to it - flag it and block the save.
    const targetEnv = environments.find((e) => e.id === (envId ?? activeId)) ?? null;
    const targetVar = targetEnv?.variables.find((v) => v.key === variable.trim());
    const selectableConflict = targetVar?.type === "selected";

    const confirm = async () => {
        const name = variable.trim();
        if (!name) return toast.error("Enter a variable name");
        if (environments.length === 0) return toast.error("Create an environment first");
        if (selectableConflict) {
            return toast.error(`"${name}" is a selectable variable - captured values can't be saved to it.`);
        }

        addPostBlock(makeSaveToEnvBlock(pathSegments, displayPath, name, envId, mode));
        if (setNow) await setVariable(name, valueToString(value), envId ?? undefined);

        toast.success(`Saved -> "${name}". A block was added to Post-response scripts.`);
        onClose();
    };

    const preview = valueToString(value);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Save field to environment"
            width={460}
            tourId="save-to-env"
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={confirm}
                        disabled={selectableConflict}
                        leftIcon={<ArrowRight size={14} />}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="rounded-lg border border-border bg-bg p-3">
                    <div className="mb-1 flex items-center justify-between">
                        <div className="text-[11px] uppercase tracking-wide text-subtle">Field</div>
                        <div className="flex items-center rounded-md border border-border bg-surface p-0.5">
                            {(["path", "jmespath"] as ExprMode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={cn(
                                        "rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors",
                                        mode === m ? "bg-elevated text-fg" : "text-subtle hover:text-fg",
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <code className="mono text-[13px] text-accent">{displayPath}</code>
                    <div className="mt-2 truncate text-[12px] text-muted">
                        = <span className="mono">{preview.length > 80 ? preview.slice(0, 80) + "…" : preview}</span>
                    </div>
                </div>

                <div>
                    <Label>Variable name</Label>
                    <Input
                        value={variable}
                        onChange={(e) => setVariable_(e.target.value)}
                        placeholder="token"
                        className="mono"
                        autoFocus
                    />
                    {selectableConflict && (
                        <p className="mt-1.5 text-[12px] text-amber-400">
                            "{variable.trim()}" is a selectable variable - it only accepts{" "}
                            {variantOptions(targetVar).join(", ") || "(no variants)"}. A captured value can't be saved
                            to it; choose a different name or environment.
                        </p>
                    )}
                </div>

                <div>
                    <Label>Environment</Label>
                    {environments.length === 0 ? (
                        <Button variant="subtle" size="sm" onClick={createEnv} leftIcon={<Plus size={14} />}>
                            Create an environment
                        </Button>
                    ) : (
                        <Select value={envId ?? ""} onChange={(e) => setEnvId(e.target.value || null)}>
                            <option value="">Active environment</option>
                            {environments.map((env) => (
                                <option key={env.id} value={env.id}>
                                    {env.name}
                                </option>
                            ))}
                        </Select>
                    )}
                </div>

                <label className="flex items-center gap-2 text-[13px] text-muted">
                    <input
                        type="checkbox"
                        checked={setNow}
                        onChange={(e) => setSetNow(e.target.checked)}
                        className="h-4 w-4 accent-accent"
                    />
                    Also set it now from this response
                </label>
            </div>
        </Modal>
    );
}
