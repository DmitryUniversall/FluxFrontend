import type { WorkspaceRole } from "@/main/features/workspaces/domain/models";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface Invitation {
    id: string;
    workspace_id: string;
    workspace_name: string;
    inviter_username: string;
    invitee_id: string;
    role: WorkspaceRole;
    status: InvitationStatus;
    created_at: string;
}
