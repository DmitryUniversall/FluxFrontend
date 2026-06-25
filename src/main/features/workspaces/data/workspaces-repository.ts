import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "../domain/models";

export const workspacesRepository = {
    list: () => api.request<Workspace[]>(endpoints.workspaces),
    create: (name: string) => api.request<Workspace>(endpoints.workspaces, { method: "POST", body: { name } }),
    rename: (id: string, name: string) =>
        api.request<Workspace>(endpoints.workspace(id), { method: "PATCH", body: { name } }),
    remove: (id: string) => api.request<void>(endpoints.workspace(id), { method: "DELETE" }),
    members: (id: string) => api.request<WorkspaceMember[]>(endpoints.workspaceMembers(id)),
    setRole: (id: string, memberId: string, role: WorkspaceRole) =>
        api.request<WorkspaceMember[]>(endpoints.workspaceMember(id, memberId), {
            method: "PATCH",
            body: { role },
        }),
    removeMember: (id: string, memberId: string) =>
        api.request<WorkspaceMember[]>(endpoints.workspaceMember(id, memberId), { method: "DELETE" }),
};

export type WorkspacesRepository = typeof workspacesRepository;
