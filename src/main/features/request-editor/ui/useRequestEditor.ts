// Request editor viewmodel. Owns the open request, its draft edits (debounced
// autosave), the send/response state, and remote-change polling for Phase 2
// collaboration. It coordinates with the environments and collections
// viewmodels (the app's integration point).
//
// Switching requests snapshots the full editor state (draft, response, logs,
// tests) into `requestCache` and restores it instantly on return - no refetch,
// no spinner, nothing lost. A cache hit is reconciled with the server in the
// background; pending unsaved edits are flushed when navigating away.
import { create } from "zustand";
import { ApiError } from "@/core/http/http-client";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { useIdentities } from "@/main/features/identities/ui/useIdentities";
import { useRequestParams } from "@/main/features/flow/ui/useRequestParams";
import { useUiPrefs } from "@/main/common/ui/useUiPrefs";
import { toast } from "@/main/common/ui/toast";
import type { Block } from "@/main/features/scripting/domain/blocks";
import type { AssertResult, ResponseView } from "@/main/features/scripting/domain/context";
import { requestsRepository } from "../data/requests-repository";
import type { Auth, HttpRequest, ScriptStage } from "../domain/models";
import { sendRequest } from "../domain/use-cases";
import { requestCache } from "./editor-cache";

interface EditorVM {
    request: HttpRequest | null;
    loading: boolean;
    sending: boolean;
    dirty: boolean;
    response: ResponseView | null;
    logs: string[];
    tests: AssertResult[];
    error: string | null;
    load: (id: string) => Promise<void>;
    update: (patch: Partial<HttpRequest>) => void;
    save: () => Promise<void>;
    setStage: (phase: "pre" | "post", stage: ScriptStage) => void;
    addPostBlock: (block: Block) => void;
    addPostBlocks: (blocks: Block[]) => void;
    send: (params?: Record<string, string>, runtimeAuth?: Auth) => Promise<void>;
    pollRemote: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Guards against a slow fetch resolving after the user clicked elsewhere.
let loadSeq = 0;
// Requests with an in-flight send, so switching back restores the indicator.
const inflightSends = new Set<string>();

export const useRequestEditor = create<EditorVM>((set, get) => ({
    request: null,
    loading: false,
    sending: false,
    dirty: false,
    response: null,
    logs: [],
    tests: [],
    error: null,

    load: async (id) => {
        const seq = ++loadSeq;
        if (saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = null;
        }

        // Snapshot (and flush) the request we're leaving so nothing is lost.
        const prev = get().request;
        if (prev && prev.id !== id) {
            requestCache.set(prev.id, {
                request: prev,
                dirty: get().dirty,
                response: get().response,
                logs: get().logs,
                tests: get().tests,
                error: get().error,
            });
            if (get().dirty) flushSave(prev, set);
        }
        if (prev?.id === id) return; // re-selecting the open request is a no-op

        const cached = requestCache.get(id);
        if (cached) {
            // Instant restore - no fetch, no flicker.
            set({ ...cached, loading: false, sending: inflightSends.has(id) });
            // Background freshness check (collaboration): adopt the remote version
            // only when it actually changed and there's no local draft to protect.
            if (!cached.dirty) {
                void requestsRepository
                    .get(id)
                    .then((fresh) => {
                        useRequestParams.getState().prime(fresh);
                        const snap = requestCache.get(id);
                        if (snap && !snap.dirty && fresh.updated_at !== snap.request.updated_at) {
                            requestCache.patch(id, { request: fresh });
                        }
                        const s = get();
                        if (s.request?.id === id && !s.dirty && fresh.updated_at !== s.request.updated_at)
                            set({ request: fresh });
                    })
                    .catch(() => {
                        /* request may have been deleted; the tree poller will catch up */
                    });
            }
            return;
        }

        set({ request: null, loading: true, response: null, logs: [], tests: [], error: null, dirty: false });
        try {
            const request = await requestsRepository.get(id);
            if (seq !== loadSeq) return; // user already moved on
            set({ request, loading: false, sending: inflightSends.has(id) });
            useRequestParams.getState().prime(request);
            requestCache.set(id, { request, dirty: false, response: null, logs: [], tests: [], error: null });
        } catch {
            if (seq === loadSeq) set({ loading: false });
        }
    },

    update: (patch) => {
        const current = get().request;
        if (!current) return;
        set({ request: { ...current, ...patch }, dirty: true });
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => void get().save(), 600);
    },

    save: async () => {
        const req = get().request;
        if (!req) return;
        try {
            const saved = await requestsRepository.save(req);
            useCollections.getState().updateSummary(saved.id, saved.name, saved.method);
            // Keep flow Call/Wait blocks' view of this request's signature live.
            useRequestParams.getState().prime(saved);
            // Sync the saved timestamp back without clobbering newer keystrokes.
            set((s) =>
                s.request && s.request.id === saved.id
                    ? { request: { ...s.request, updated_at: saved.updated_at }, dirty: false }
                    : { dirty: false },
            );
        } catch {
            /* keep dirty; will retry on next edit */
        }
    },

    setStage: (phase, stage) => {
        const current = get().request;
        if (!current) return;
        get().update({ scripts: { ...current.scripts, [phase]: stage } });
    },

    addPostBlock: (block) => {
        const current = get().request;
        if (!current) return;
        const post = current.scripts.post;
        get().setStage("post", { ...post, blocks: [...post.blocks, block] });
    },

    addPostBlocks: (blocks) => {
        const current = get().request;
        if (!current || blocks.length === 0) return;
        const post = current.scripts.post;
        get().setStage("post", { ...post, blocks: [...post.blocks, ...blocks] });
    },

    send: async (params, runtimeAuth) => {
        const req = get().request;
        if (!req) return;
        const id = req.id;
        inflightSends.add(id);
        set({ sending: true, error: null, logs: [], tests: [] });
        try {
            const env = useEnvironments.getState().getActive();
            const apply = useEnvironments.getState().applyMutations;
            const resolveAuth = useIdentities.getState().resolve;
            const { response, logs, tests } = await sendRequest(
                req,
                requestsRepository,
                env,
                apply,
                params,
                resolveAuth,
                runtimeAuth,
            );
            inflightSends.delete(id);
            if (get().request?.id === id) set({ response, logs, tests, sending: false });
            // The user switched away mid-send: land the result in the snapshot so
            // it's right there when they come back.
            else requestCache.patch(id, { response, logs, tests, error: null });
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Request failed";
            inflightSends.delete(id);
            if (get().request?.id === id) set({ error: msg, sending: false, response: null });
            else requestCache.patch(id, { error: msg, response: null });
        }
    },

    // Pull a collaborator's saved changes (~3s poll). Never overwrites local
    // unsaved edits: skipped while dirty or sending.
    pollRemote: async () => {
        const req = get().request;
        if (!req || get().dirty || get().sending) return;
        try {
            const fresh = await requestsRepository.get(req.id);
            if (fresh.updated_at !== req.updated_at) {
                set({ request: fresh, dirty: false });
                requestCache.patch(req.id, { request: fresh, dirty: false });
                useRequestParams.getState().prime(fresh);
                if (useUiPrefs.getState().collaboratorToasts) toast.info("Request updated by a collaborator");
            }
        } catch {
            /* ignore poll errors (e.g. request deleted) */
        }
    },
}));

/**
 * Flush a pending autosave for the request being navigated away from, so
 * edits inside the 600ms debounce window aren't lost. On success the snapshot
 * (and the live store, if the user already switched back) is marked clean -
 * but only if that exact draft is still current (identity check), so edits
 * made in the meantime stay dirty and get their own save.
 */
function flushSave(draft: HttpRequest, set: (fn: (s: EditorVM) => Partial<EditorVM>) => void): void {
    void requestsRepository
        .save(draft)
        .then((saved) => {
            useCollections.getState().updateSummary(saved.id, saved.name, saved.method);
            useRequestParams.getState().prime({ ...draft, updated_at: saved.updated_at });
            const snap = requestCache.get(saved.id);
            if (snap && snap.request === draft) {
                requestCache.set(saved.id, {
                    ...snap,
                    request: { ...draft, updated_at: saved.updated_at },
                    dirty: false,
                });
            }
            set((s) =>
                s.request === draft ? { request: { ...draft, updated_at: saved.updated_at }, dirty: false } : {},
            );
        })
        .catch(() => {
            /* snapshot stays dirty; the next save will retry */
        });
}
