import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import { workspaceContext } from "@/main/common/api/workspace-context";
import type { Collection, CollectionNode, RequestSummary } from "../domain/models";

interface CreatedRequest {
    id: string;
    name: string;
    method: string;
    collection_id: string;
    kind: "http" | "flow";
}

export const collectionsRepository = {
    tree: () => api.request<CollectionNode[]>(endpoints.tree(workspaceContext.require())),
    createCollection: (name: string) =>
        api.request<Collection>(endpoints.collections, {
            method: "POST",
            body: { name, workspace_id: workspaceContext.require() },
        }),
    renameCollection: (id: string, name: string) =>
        api.request<Collection>(endpoints.collection(id), { method: "PATCH", body: { name } }),
    deleteCollection: (id: string) => api.request<void>(endpoints.collection(id), { method: "DELETE" }),
    reorderCollections: (workspaceId: string, collectionIds: string[]) =>
        api.request<void>(endpoints.reorderCollections, {
            method: "POST",
            body: { workspace_id: workspaceId, collection_ids: collectionIds },
        }),
    moveRequest: (id: string, collectionId: string, position: number) =>
        api.request<void>(endpoints.moveRequest(id), {
            method: "POST",
            body: { collection_id: collectionId, position },
        }),
    createRequest: (collectionId: string, name: string, method: string, kind: "http" | "flow" = "http") =>
        api.request<CreatedRequest>(endpoints.requests, {
            method: "POST",
            body: { collection_id: collectionId, name, method, kind },
        }),
    deleteRequest: (id: string) => api.request<void>(endpoints.request(id), { method: "DELETE" }),
    duplicateRequest: (id: string) => api.request<CreatedRequest>(endpoints.duplicateRequest(id), { method: "POST" }),
};

export type { RequestSummary };
export type CollectionsRepository = typeof collectionsRepository;
