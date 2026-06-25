// Active-workspace general settings (server-stored): rename and delete. Hidden
// behind the settings screen so they don't clutter the request tree. Personal
// workspaces and non-owners are read-only.
import { useEffect, useState } from "react";
import { ApiError } from "@/core/http/http-client";
import { Button } from "@/main/common/ui/Button";
import { Input } from "@/main/common/ui/Field";
import { EmptyState } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { Layers, Trash2 } from "lucide-react";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { SettingField, SettingRow, SettingsGroup, SettingsPage } from "../parts";

export function WorkspaceGeneralSection() {
    const { active, rename, remove } = useWorkspaces();
    const current = active();
    const [name, setName] = useState(current?.name ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => setName(current?.name ?? ""), [current?.id, current?.name]);

    if (!current) {
        return (
            <SettingsPage title="Workspace">
                <EmptyState icon={<Layers size={22} />} title="No workspace" hint="Create or pick a workspace first." />
            </SettingsPage>
        );
    }

    const canManage = current.role === "owner" && !current.is_personal;
    const nameChanged = name.trim() !== "" && name.trim() !== current.name;

    const saveName = async () => {
        setSaving(true);
        try {
            await rename(current.id, name.trim());
            toast.success("Workspace renamed");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't rename workspace");
            setName(current.name);
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        if (!window.confirm(`Delete workspace “${current.name}” and everything in it?`)) return;
        try {
            await remove(current.id);
            toast.info("Workspace deleted");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't delete workspace");
        }
    };

    return (
        <SettingsPage title={current.name} description="Settings for the active workspace. Stored on the server.">
            <SettingsGroup title="General">
                <SettingField
                    label="Workspace name"
                    hint={
                        current.is_personal
                            ? "Your personal workspace can't be renamed."
                            : !canManage
                              ? "Only the owner can rename this workspace."
                              : undefined
                    }
                >
                    <div className="flex gap-2">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="max-w-xs"
                            disabled={!canManage}
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={saveName}
                            disabled={!canManage || !nameChanged || saving}
                        >
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </SettingField>
                <SettingRow
                    title="Role"
                    description={current.is_personal ? "Your personal workspace." : undefined}
                    control={<span className="text-[13px] capitalize text-muted">{current.role}</span>}
                />
            </SettingsGroup>

            {canManage && (
                <SettingsGroup title="Danger zone">
                    <SettingRow
                        title="Delete this workspace"
                        description="Permanently removes the workspace and all its collections, requests, environments and identities."
                        control={
                            <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />} onClick={onDelete}>
                                Delete
                            </Button>
                        }
                    />
                </SettingsGroup>
            )}
        </SettingsPage>
    );
}
