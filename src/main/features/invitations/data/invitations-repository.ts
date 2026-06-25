import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { WorkspaceRole } from "@/main/features/workspaces/domain/models";
import type { Invitation } from "../domain/models";

export const invitationsRepository = {
    create: (workspaceId: string, username: string, role: WorkspaceRole) =>
        api.request<Invitation>(endpoints.workspaceInvitations(workspaceId), {
            method: "POST",
            body: { username, role },
        }),
    accept: (id: string) => api.request<Invitation>(endpoints.acceptInvitation(id), { method: "POST" }),
    decline: (id: string) => api.request<Invitation>(endpoints.declineInvitation(id), { method: "POST" }),
};

export type InvitationsRepository = typeof invitationsRepository;
