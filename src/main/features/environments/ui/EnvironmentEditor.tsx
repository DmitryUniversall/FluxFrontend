import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { Input, Select } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { OptionsEditor } from "@/main/common/ui/OptionsEditor";
import { toast } from "@/main/common/ui/toast";
import type { EnvVarType, EnvVariable } from "../domain/models";
import { useEnvironments } from "./useEnvironments";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function EnvironmentEditor({ open, onClose }: Props) {
    const { getActive, save, remove } = useEnvironments();
    const active = getActive();
    const [name, setName] = useState("");
    const [vars, setVars] = useState<EnvVariable[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && active) {
            setName(active.name);
            setVars(active.variables.length ? active.variables : [{ key: "", value: "", enabled: true }]);
        }
    }, [open, active]);

    if (!active) return null;

    const update = (i: number, patch: Partial<EnvVariable>) =>
        setVars((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const addRow = () => setVars((rows) => [...rows, { key: "", value: "", enabled: true }]);
    const removeRow = (i: number) => setVars((rows) => rows.filter((_, idx) => idx !== i));
    // Switching to "selected" seeds the variant list from the current value so the
    // chosen value stays valid; switching back leaves the options in place.
    const changeType = (i: number, type: EnvVarType) =>
        setVars((rows) =>
            rows.map((r, idx) => {
                if (idx !== i) return r;
                if (type === "selected" && !r.options?.length)
                    return { ...r, type, options: r.value ? [r.value] : [""] };
                return { ...r, type };
            }),
        );

    const onSave = async () => {
        setSaving(true);
        try {
            const cleaned = vars
                .filter((v) => v.key.trim())
                .map((v) =>
                    v.type === "selected" ? { ...v, options: (v.options ?? []).filter((o) => o.trim() !== "") } : v,
                );
            await save({ ...active, name: name.trim() || active.name, variables: cleaned });
            toast.success("Environment saved");
            onClose();
        } catch {
            toast.error("Could not save environment");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        await remove(active.id);
        toast.info("Environment deleted");
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Environment variables"
            width={560}
            footer={
                <>
                    <Button variant="danger" size="sm" onClick={onDelete} leftIcon={<Trash2 size={14} />}>
                        Delete
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </>
            }
        >
            <div className="mb-4">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Environment name" />
            </div>
            <div className="space-y-2">
                {vars.map((v, i) => {
                    const type = v.type ?? "raw";
                    const opts = (v.options ?? []).filter((o) => o.trim() !== "");
                    return (
                        <div key={i} className="rounded-xl border border-border bg-bg/40 p-2.5">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={v.enabled}
                                    onChange={(e) => update(i, { enabled: e.target.checked })}
                                    className="h-4 w-4 shrink-0 accent-accent"
                                />
                                <Input
                                    value={v.key}
                                    onChange={(e) => update(i, { key: e.target.value })}
                                    placeholder="API_KEY"
                                    className="mono flex-1"
                                />
                                <Select
                                    value={type}
                                    onChange={(e) => changeType(i, e.target.value as EnvVarType)}
                                    className="h-9 w-28 text-[13px]"
                                    title="raw: free text · selected: pick from variants"
                                >
                                    <option value="raw">raw</option>
                                    <option value="selected">selected</option>
                                </Select>
                                {type === "selected" ? (
                                    <Select
                                        value={v.value}
                                        onChange={(e) => update(i, { value: e.target.value })}
                                        className="mono h-9 flex-1 text-[13px]"
                                    >
                                        {opts.length === 0 && <option value="">- no variants -</option>}
                                        {opts.map((o, idx) => (
                                            <option key={idx} value={o}>
                                                {o}
                                            </option>
                                        ))}
                                        {v.value && !opts.includes(v.value) && (
                                            <option value={v.value}>{v.value}</option>
                                        )}
                                    </Select>
                                ) : (
                                    <Input
                                        value={v.value}
                                        onChange={(e) => update(i, { value: e.target.value })}
                                        placeholder="value"
                                        className="mono flex-1"
                                    />
                                )}
                                <IconButton label="Remove" onClick={() => removeRow(i)}>
                                    <Trash2 size={14} />
                                </IconButton>
                            </div>
                            {type === "selected" && (
                                <div className="mt-2 pl-6">
                                    <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
                                        Variants <span className="text-subtle/70">· radio marks the active value</span>
                                    </div>
                                    <OptionsEditor
                                        options={v.options ?? []}
                                        onChange={(options) => update(i, { options })}
                                        current={v.value}
                                        onSelectCurrent={(value) => update(i, { value })}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={addRow} leftIcon={<Plus size={14} />}>
                Add variable
            </Button>
        </Modal>
    );
}
