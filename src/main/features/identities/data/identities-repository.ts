import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import { workspaceContext } from "@/main/common/api/workspace-context";
import type { Identity } from "../domain/models";

export const identitiesRepository = {
    list: () => api.request<Identity[]>(endpoints.identitiesIn(workspaceContext.require())),
    create: (name: string) =>
        api.request<Identity>(endpoints.identities, {
            method: "POST",
            body: { name, workspace_id: workspaceContext.require() },
        }),
    update: (identity: Identity) =>
        api.request<Identity>(endpoints.identity(identity.id), { method: "PUT", body: identity }),
    remove: (id: string) => api.request<void>(endpoints.identity(id), { method: "DELETE" }),
    setDefault: (id: string) => api.request<Identity[]>(endpoints.identityDefault(id), { method: "POST" }),
};

export type IdentitiesRepository = typeof identitiesRepository;
