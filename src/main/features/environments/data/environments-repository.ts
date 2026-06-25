import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import { workspaceContext } from "@/main/common/api/workspace-context";
import type { Environment } from "../domain/models";

export const environmentsRepository = {
    list: () => api.request<Environment[]>(endpoints.environmentsIn(workspaceContext.require())),
    create: (name: string) =>
        api.request<Environment>(endpoints.environments, {
            method: "POST",
            body: { name, workspace_id: workspaceContext.require() },
        }),
    update: (env: Environment) => api.request<Environment>(endpoints.environment(env.id), { method: "PUT", body: env }),
    remove: (id: string) => api.request<void>(endpoints.environment(id), { method: "DELETE" }),
};

export type EnvironmentsRepository = typeof environmentsRepository;
