// Workspace members (server-stored): list people, change roles, remove access.
// Owners manage; everyone else sees a read-only roster.
import { useEffect, useState } from "react";
import { Crown, Trash2, Users } from "lucide-react";
import { IconButton } from "@/main/common/ui/Button";
import { EmptyState } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import type { WorkspaceMember, WorkspaceRole } from "@/main/features/workspaces/domain/models";
import { HelpButton } from "@/main/features/guide/ui/HelpButton";
import { collaborationTour } from "@/main/features/guide/tours/scoped";
import { SettingsGroup, SettingsPage } from "../parts";

export function MembersSection() {
    const { active, members: fetchMembers, setRole, removeMember } = useWorkspaces();
    const current = active();
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const isOwner = current?.role === "owner";

    useEffect(() => {
        if (current)
            void fetchMembers(current.id)
                .then(setMembers)
                .catch(() => setMembers([]));
    }, [current?.id, fetchMembers]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!current) {
        return (
            <SettingsPage title="Members">
                <EmptyState icon={<Users size={22} />} title="No workspace" hint="Create or pick a workspace first." />
            </SettingsPage>
        );
    }

    const changeRole = async (id: string, role: WorkspaceRole) => {
        try {
            setMembers(await setRole(current.id, id, role));
        } catch {
            toast.error("Couldn't change role");
        }
    };
    const remove = async (id: string, name: string) => {
        try {
            setMembers(await removeMember(current.id, id));
            toast.info(`Removed ${name}`);
        } catch {
            toast.error("Couldn't remove member");
        }
    };

    return (
        <SettingsPage
            title="Members"
            description={
                isOwner ? "Manage who can collaborate in this workspace." : "People with access to this workspace."
            }
            action={<HelpButton tour={collaborationTour} title="Collaboration" />}
        >
            <SettingsGroup title={`${members.length} ${members.length === 1 ? "person" : "people"}`}>
                {members.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[12px] text-subtle">No members yet.</p>
                ) : (
                    members.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-[12px] font-semibold">
                                {m.username[0]?.toUpperCase()}
                            </div>
                            <span className="flex-1 truncate text-[13px] text-fg">{m.username}</span>
                            {m.role === "owner" ? (
                                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                                    <Crown size={12} /> Owner
                                </span>
                            ) : isOwner ? (
                                <>
                                    <select
                                        value={m.role}
                                        onChange={(e) => void changeRole(m.id, e.target.value as WorkspaceRole)}
                                        className="h-7 rounded-md border border-border bg-bg px-1.5 text-[12px] text-fg outline-none ring-accent"
                                    >
                                        <option value="editor">Editor</option>
                                    </select>
                                    <IconButton label="Remove" onClick={() => void remove(m.id, m.username)}>
                                        <Trash2 size={13} />
                                    </IconButton>
                                </>
                            ) : (
                                <span className="text-[11px] capitalize text-subtle">{m.role}</span>
                            )}
                        </div>
                    ))
                )}
            </SettingsGroup>
        </SettingsPage>
    );
}
