// Caches the bits a flow step needs about a target request: its declared
// parameters (the "signature") and its auth type - enough to suggest/pre-fill
// args and to warn when a "parameter" auth must be overridden. The collections
// tree only carries summaries, so we fetch the full entity once per request.
import { create } from "zustand";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type { AuthType, HttpRequest, RequestParam } from "@/main/features/request-editor/domain/models";

interface CachedTarget {
    params: RequestParam[];
    authType: AuthType;
}

interface RequestParamsCache {
    byId: Record<string, CachedTarget>;
    loading: Record<string, boolean>;
    ensure: (id: string) => Promise<void>;
    // Refresh the cache from a known-current request. Called by the request editor
    // whenever it persists or adopts a fresh version, so a flow's Call/Wait blocks
    // reflect parameter/auth edits live (the cache is otherwise filled once and
    // would stay stale until a full reload).
    prime: (req: HttpRequest) => void;
    invalidate: (id: string) => void;
}

export const useRequestParams = create<RequestParamsCache>((set, get) => ({
    byId: {},
    loading: {},

    ensure: async (id) => {
        if (!id || get().byId[id] || get().loading[id]) return;
        set((s) => ({ loading: { ...s.loading, [id]: true } }));
        try {
            const req = await requestsRepository.get(id);
            set((s) => ({
                byId: { ...s.byId, [id]: { params: req.parameters ?? [], authType: req.auth?.type ?? "none" } },
                loading: { ...s.loading, [id]: false },
            }));
        } catch {
            // Request may be gone; leave it uncached so a later attempt can retry.
            set((s) => ({ loading: { ...s.loading, [id]: false } }));
        }
    },

    prime: (req) => {
        if (!req?.id) return;
        set((s) => ({
            byId: { ...s.byId, [req.id]: { params: req.parameters ?? [], authType: req.auth?.type ?? "none" } },
        }));
    },

    invalidate: (id) => {
        if (!id || !get().byId[id]) return;
        set((s) => {
            const byId = { ...s.byId };
            delete byId[id];
            return { byId };
        });
    },
}));
