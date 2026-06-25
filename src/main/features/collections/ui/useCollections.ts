// Collections viewmodel: owns the sidebar tree (owned + shared) and the
// currently selected request. `refresh` is a silent reload used by the ~3s
// sync poller; it only updates state when the tree actually changed.
import { create } from "zustand";
import { flowCache, requestCache } from "@/main/features/request-editor/ui/editor-cache";
import { useRequestParams } from "@/main/features/flow/ui/useRequestParams";
import { collectionsRepository } from "../data/collections-repository";
import type { CollectionNode } from "../domain/models";

interface CollectionsVM {
    tree: CollectionNode[];
    selectedRequestId: string | null;
    loading: boolean;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    select: (id: string | null) => void;
    createCollection: (name: string) => Promise<string | null>;
    renameCollection: (id: string, name: string) => Promise<void>;
    deleteCollection: (id: string) => Promise<void>;
    reorderCollections: (orderedIds: string[]) => Promise<void>;
    moveRequest: (requestId: string, toCollectionId: string, index: number) => Promise<void>;
    createRequest: (collectionId: string, kind?: "http" | "flow") => Promise<void>;
    deleteRequest: (id: string) => Promise<void>;
    duplicateRequest: (id: string) => Promise<void>;
    updateSummary: (id: string, name: string, method: string) => void;
}

export const useCollections = create<CollectionsVM>((set, get) => ({
    tree: [],
    selectedRequestId: null,
    loading: false,

    load: async () => {
        set({ loading: true });
        const tree = await collectionsRepository.tree();
        set({ tree, loading: false });
    },

    refresh: async () => {
        try {
            const tree = await collectionsRepository.tree();
            // avoid needless re-renders when nothing changed
            if (JSON.stringify(tree) !== JSON.stringify(get().tree)) set({ tree });
        } catch {
            /* polling failures are non-fatal */
        }
    },

    select: (id) => set({ selectedRequestId: id }),

    createCollection: async (name) => {
        const created = await collectionsRepository.createCollection(name);
        await get().refresh();
        return created?.id ?? null;
    },

    renameCollection: async (id, name) => {
        await collectionsRepository.renameCollection(id, name);
        set((s) => ({ tree: s.tree.map((c) => (c.id === id ? { ...c, name } : c)) }));
    },

    deleteCollection: async (id) => {
        const col = get().tree.find((c) => c.id === id);
        await collectionsRepository.deleteCollection(id);
        for (const r of col?.requests ?? []) {
            requestCache.remove(r.id);
            flowCache.remove(r.id);
            useRequestParams.getState().invalidate(r.id);
        }
        set((s) => ({ tree: s.tree.filter((c) => c.id !== id) }));
    },

    // ---- drag-and-drop (optimistic: reorder locally, then persist) ----
    reorderCollections: async (orderedIds) => {
        const tree = get().tree;
        const workspaceId = tree[0]?.workspace_id;
        if (!workspaceId) return;
        const byId = new Map(tree.map((c) => [c.id, c]));
        const next = orderedIds.map((id) => byId.get(id)).filter((c): c is CollectionNode => !!c);
        next.push(...tree.filter((c) => !orderedIds.includes(c.id)));
        set({ tree: next });
        try {
            await collectionsRepository.reorderCollections(workspaceId, orderedIds);
        } catch {
            await get().refresh(); // server is the source of truth on failure
        }
    },

    moveRequest: async (requestId, toCollectionId, index) => {
        const tree = get().tree;
        let moved: CollectionNode["requests"][number] | undefined;
        for (const c of tree) moved = moved ?? c.requests.find((r) => r.id === requestId);
        if (!moved || !tree.some((c) => c.id === toCollectionId)) return;
        const next = tree.map((c) => {
            const requests = c.requests.filter((r) => r.id !== requestId);
            if (c.id === toCollectionId) {
                const at = Math.max(0, Math.min(index, requests.length));
                requests.splice(at, 0, { ...moved!, collection_id: toCollectionId });
            }
            return { ...c, requests };
        });
        set({ tree: next });
        try {
            await collectionsRepository.moveRequest(requestId, toCollectionId, index);
        } catch {
            await get().refresh();
        }
    },

    createRequest: async (collectionId, kind = "http") => {
        const name = kind === "flow" ? "New flow" : "New request";
        const req = await collectionsRepository.createRequest(collectionId, name, "GET", kind);
        set((s) => ({
            tree: s.tree.map((c) =>
                c.id === collectionId
                    ? {
                          ...c,
                          requests: [
                              ...c.requests,
                              {
                                  id: req.id,
                                  name: req.name,
                                  method: req.method,
                                  collection_id: collectionId,
                                  kind: req.kind,
                              },
                          ],
                      }
                    : c,
            ),
            selectedRequestId: req.id,
        }));
    },

    deleteRequest: async (id) => {
        await collectionsRepository.deleteRequest(id);
        requestCache.remove(id);
        flowCache.remove(id);
        useRequestParams.getState().invalidate(id);
        set((s) => ({
            tree: s.tree.map((c) => ({ ...c, requests: c.requests.filter((r) => r.id !== id) })),
            selectedRequestId: s.selectedRequestId === id ? null : s.selectedRequestId,
        }));
    },

    duplicateRequest: async (id) => {
        const req = await collectionsRepository.duplicateRequest(id);
        set((s) => ({
            tree: s.tree.map((c) =>
                c.id === req.collection_id
                    ? {
                          ...c,
                          requests: [
                              ...c.requests,
                              {
                                  id: req.id,
                                  name: req.name,
                                  method: req.method,
                                  collection_id: req.collection_id,
                                  kind: req.kind,
                              },
                          ],
                      }
                    : c,
            ),
            selectedRequestId: req.id,
        }));
    },

    updateSummary: (id, name, method) =>
        set((s) => ({
            tree: s.tree.map((c) => ({
                ...c,
                requests: c.requests.map((r) => (r.id === id ? { ...r, name, method } : r)),
            })),
        })),
}));
