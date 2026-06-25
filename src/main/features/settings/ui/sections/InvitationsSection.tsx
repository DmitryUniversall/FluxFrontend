// Workspace invitations (server-stored): owners invite by username; the invitee
// accepts from their notifications and joins the workspace.
import { useState } from "react";
import { Send, Users } from "lucide-react";
import { ApiError } from "@/core/http/http-client";
import { Button } from "@/main/common/ui/Button";
import { Input, Select } from "@/main/common/ui/Field";
import { EmptyState } from "@/main/common/ui/feedback";
import { toast } from "@/main/common/ui/toast";
import { invitationsRepository } from "@/main/features/invitations/data/invitations-repository";
import type { WorkspaceRole } from "@/main/features/workspaces/domain/models";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { SettingField, SettingsGroup, SettingsPage } from "../parts";

export function InvitationsSection() {
    const current = useWorkspaces((s) => s.active());
    const [username, setUsername] = useState("");
    const [role, setRole] = useState<WorkspaceRole>("editor");
    const [inviting, setInviting] = useState(false);

    if (!current) {
        return (
            <SettingsPage title="Invitations">
                <EmptyState icon={<Users size={22} />} title="No workspace" hint="Create or pick a workspace first." />
            </SettingsPage>
        );
    }

    const isOwner = current.role === "owner";

    const sendInvite = async () => {
        const name = username.trim();
        if (!name) return;
        setInviting(true);
        try {
            await invitationsRepository.create(current.id, name, role);
            setUsername("");
            toast.success(`Invitation sent to ${name}`);
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't send invitation");
        } finally {
            setInviting(false);
        }
    };

    if (!isOwner) {
        return (
            <SettingsPage title="Invitations">
                <EmptyState
                    icon={<Send size={22} />}
                    title="Owners only"
                    hint="Only the workspace owner can invite people."
                />
            </SettingsPage>
        );
    }

    return (
        <SettingsPage title="Invitations" description="Invite people to collaborate in this workspace.">
            <SettingsGroup title="Invite someone">
                <SettingField
                    label="Username"
                    hint="They'll get a notification and join once they accept. Editors can work with collections, requests and flows."
                >
                    <div className="flex gap-2">
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void sendInvite()}
                            placeholder="username"
                            className="mono max-w-xs"
                        />
                        <Select
                            value={role}
                            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                            className="h-9 w-28 shrink-0"
                        >
                            <option value="editor">Editor</option>
                        </Select>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={sendInvite}
                            disabled={inviting || !username.trim()}
                            leftIcon={<Send size={14} />}
                        >
                            Invite
                        </Button>
                    </div>
                </SettingField>
            </SettingsGroup>
        </SettingsPage>
    );
}
