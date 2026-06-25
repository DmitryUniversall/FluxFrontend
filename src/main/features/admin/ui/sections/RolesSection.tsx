// Roles: list the instance roles and edit their permission sets. Guards mirror the
// backend - the owner role is locked, system/default roles can't be deleted, and
// you can only grant permissions you already hold (anti-escalation).
import { Crown, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/core/http/http-client";
import { Button } from "@/main/common/ui/Button";
import { Checkbox, Input, Textarea } from "@/main/common/ui/Field";
import { Switch } from "@/main/common/ui/Switch";
import { toast } from "@/main/common/ui/toast";
import { cn } from "@/main/common/utils/cn";
import { useAuth } from "@/main/features/auth/ui/useAuth";
import type { Permission, Role } from "../../domain/models";
import { useAdminScreen } from "../useAdminScreen";

interface RoleDraft {
    id: string | null;
    name: string;
    description: string;
    is_default: boolean;
    permissions: string[];
}

const OWNER_ID = "owner";

function draftFrom(role: Role): RoleDraft {
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        is_default: role.is_default,
        permissions: [...role.permissions],
    };
}

const BLANK: RoleDraft = { id: null, name: "", description: "", is_default: false, permissions: [] };

export function RolesSection() {
    const { roles, permissions, loadRoles, createRole, updateRole, deleteRole } = useAdminScreen();
    const myPermissions = useAuth((s) => s.user?.permissions ?? []);
    const [draft, setDraft] = useState<RoleDraft | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    const groups = useMemo(() => groupPermissions(permissions), [permissions]);
    const isOwner = draft?.id === OWNER_ID;
    const selectedRole = roles.find((r) => r.id === draft?.id);
    const canDelete = selectedRole && !selectedRole.is_system && !selectedRole.is_default;

    const togglePermission = (key: string) => {
        setDraft((d) => {
            if (!d) return d;
            const has = d.permissions.includes(key);
            return { ...d, permissions: has ? d.permissions.filter((p) => p !== key) : [...d.permissions, key] };
        });
    };

    const save = async () => {
        if (!draft) return;
        setBusy(true);
        try {
            const body = {
                name: draft.name.trim(),
                description: draft.description.trim(),
                permissions: draft.permissions,
                is_default: draft.is_default,
            };
            if (draft.id) await updateRole(draft.id, body);
            else await createRole(body);
            toast.success(draft.id ? "Role updated" : "Role created");
            setDraft(null);
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't save role");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!draft?.id) return;
        setBusy(true);
        try {
            await deleteRole(draft.id);
            toast.info("Role deleted");
            setDraft(null);
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't delete role");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                        <Shield size={14} className="text-accent" /> Roles
                    </h2>
                    <Button
                        size="sm"
                        variant="subtle"
                        leftIcon={<Plus size={14} />}
                        onClick={() => setDraft({ ...BLANK })}
                    >
                        New
                    </Button>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setDraft(draftFrom(role))}
                            className={cn(
                                "flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left last:border-0 transition-colors",
                                draft?.id === role.id ? "bg-accent/10" : "hover:bg-elevated",
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                                    {role.id === OWNER_ID && <Crown size={12} className="text-amber-400" />}
                                    <span className="truncate">{role.name}</span>
                                </div>
                                <div className="mt-0.5 truncate text-[11.5px] text-subtle">
                                    {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                {role.is_default && <Tag>Default</Tag>}
                                {role.is_system && <Tag>System</Tag>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {draft ? (
                <div className="rounded-xl border border-border bg-surface p-4">
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1.5 block text-[12px] font-medium text-subtle">Name</label>
                            <Input
                                value={draft.name}
                                disabled={isOwner}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                placeholder="e.g. Release manager"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[12px] font-medium text-subtle">Description</label>
                            <Textarea
                                rows={2}
                                value={draft.description}
                                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                placeholder="What is this role for?"
                            />
                        </div>
                        <label className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2">
                            <span className="text-[13px] text-fg">Default role for new users</span>
                            <Switch
                                checked={draft.is_default}
                                disabled={draft.is_default || isOwner}
                                onChange={(v) => setDraft({ ...draft, is_default: v })}
                                label="Default role"
                            />
                        </label>
                    </div>

                    <div className="mt-4">
                        <p className="mb-2 text-[12px] font-medium text-subtle">
                            Permissions{isOwner && " (the owner role always has every permission)"}
                        </p>
                        <div className="space-y-3">
                            {groups.map(([group, perms]) => (
                                <div key={group}>
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                                        {group}
                                    </p>
                                    <div className="overflow-hidden rounded-lg border border-border">
                                        {perms.map((perm) => {
                                            const checked = isOwner || draft.permissions.includes(perm.key);
                                            const lackedByActor = !myPermissions.includes(perm.key);
                                            const disabled = isOwner || (lackedByActor && !checked);
                                            return (
                                                <label
                                                    key={perm.key}
                                                    className={cn(
                                                        "flex items-start gap-2.5 border-b border-border px-3 py-2 last:border-0",
                                                        disabled ? "opacity-50" : "cursor-pointer hover:bg-elevated",
                                                    )}
                                                >
                                                    <Checkbox
                                                        className="mt-0.5"
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onChange={() => togglePermission(perm.key)}
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block text-[13px] text-fg">{perm.label}</span>
                                                        <span className="block text-[11.5px] text-subtle">
                                                            {perm.description}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <Button variant="primary" disabled={busy || !draft.name.trim()} onClick={() => void save()}>
                            {draft.id ? "Save role" : "Create role"}
                        </Button>
                        <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
                            Cancel
                        </Button>
                        <div className="flex-1" />
                        {canDelete && (
                            <Button
                                variant="danger"
                                disabled={busy}
                                leftIcon={<Trash2 size={14} />}
                                onClick={() => void remove()}
                            >
                                Delete
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-[13px] text-subtle">
                    Select a role to edit, or create a new one.
                </div>
            )}
        </div>
    );
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-subtle">
            {children}
        </span>
    );
}

function groupPermissions(permissions: Permission[]): [string, Permission[]][] {
    const map = new Map<string, Permission[]>();
    for (const perm of permissions) {
        const list = map.get(perm.group) ?? [];
        list.push(perm);
        map.set(perm.group, list);
    }
    return [...map.entries()];
}
