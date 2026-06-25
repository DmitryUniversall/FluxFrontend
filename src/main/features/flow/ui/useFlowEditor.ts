// Flow editor viewmodel. A flow is stored as a request entity (kind="flow")
// whose steps live in `flow.steps`. Owns load + debounced autosave of the step
// tree, and the run lifecycle (progress + stop).
//
// Like the request editor, switching flows snapshots the editor state (steps
// draft + last run results) into `flowCache` and restores it instantly on
// return. A run in progress cannot follow across a switch: it is stopped and
// its partial results are kept in the snapshot.
import { create } from "zustand";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { useIdentities } from "@/main/features/identities/ui/useIdentities";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type { FlowStep, HttpRequest } from "@/main/features/request-editor/domain/models";
import { flowCache } from "@/main/features/request-editor/ui/editor-cache";
import { runFlow, type InputProvider, type StepResult } from "../domain/runner";

// A live prompt raised by an `input` step: the run is suspended until the user
// submits (or cancels via `submitInput`).
interface PendingInput {
    prompt: string;
    variable: string;
    secret: boolean;
    defaultValue: string;
    resolve: (value: string | null) => void;
}

interface FlowVM {
    flow: HttpRequest | null;
    loading: boolean;
    dirty: boolean;
    running: boolean;
    results: StepResult[];
    vars: Record<string, string>;
    pendingInput: PendingInput | null;
    load: (id: string) => Promise<void>;
    rename: (name: string) => void;
    setSteps: (steps: FlowStep[]) => void;
    save: () => Promise<void>;
    run: () => Promise<void>;
    stop: () => void;
    submitInput: (value: string | null) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Guards against a slow fetch resolving after the user clicked elsewhere.
let loadSeq = 0;

export const useFlowEditor = create<FlowVM>((set, get) => {
    const scheduleSave = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => void get().save(), 600);
    };

    return {
        flow: null,
        loading: false,
        dirty: false,
        running: false,
        results: [],
        vars: {},
        pendingInput: null,

        load: async (id) => {
            const seq = ++loadSeq;
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            get().pendingInput?.resolve(null); // unblock any prompt from a prior run

            // Snapshot the flow we're leaving: steps draft + last run results. A run
            // in progress is stopped (the runner checks between steps); whatever it
            // produced so far stays visible when the user returns.
            const prev = get().flow;
            if (prev && prev.id !== id) {
                flowCache.set(prev.id, { flow: prev, dirty: get().dirty, results: get().results, vars: get().vars });
                if (get().dirty) flushSave(prev, set);
            }
            if (prev?.id === id) return; // re-selecting the open flow is a no-op

            const cached = flowCache.get(id);
            if (cached) {
                set({ ...cached, loading: false, running: false, pendingInput: null });
                // Background freshness check (collaboration), like the request editor.
                if (!cached.dirty) {
                    void requestsRepository
                        .get(id)
                        .then((fresh) => {
                            if (!fresh.flow || !Array.isArray(fresh.flow.steps)) fresh.flow = { steps: [] };
                            const snap = flowCache.get(id);
                            if (snap && !snap.dirty && fresh.updated_at !== snap.flow.updated_at)
                                flowCache.patch(id, { flow: fresh });
                            const s = get();
                            if (s.flow?.id === id && !s.dirty && fresh.updated_at !== s.flow.updated_at)
                                set({ flow: fresh });
                        })
                        .catch(() => {
                            /* flow may have been deleted; the tree poller will catch up */
                        });
                }
                return;
            }

            set({ flow: null, loading: true, results: [], vars: {}, dirty: false, running: false, pendingInput: null });
            try {
                const flow = await requestsRepository.get(id);
                if (seq !== loadSeq) return; // user already moved on
                if (!flow.flow || !Array.isArray(flow.flow.steps)) flow.flow = { steps: [] };
                set({ flow, loading: false });
                flowCache.set(id, { flow, dirty: false, results: [], vars: {} });
            } catch {
                if (seq === loadSeq) set({ loading: false });
            }
        },

        rename: (name) => {
            const f = get().flow;
            if (!f) return;
            set({ flow: { ...f, name }, dirty: true });
            scheduleSave();
        },

        setSteps: (steps) => {
            const f = get().flow;
            if (!f) return;
            set({ flow: { ...f, flow: { steps } }, dirty: true });
            scheduleSave();
        },

        save: async () => {
            const f = get().flow;
            if (!f || !get().dirty) return;
            const saved = await requestsRepository.save(f);
            set((s) => ({ flow: s.flow ? { ...s.flow, updated_at: saved.updated_at } : s.flow, dirty: false }));
            useCollections.getState().updateSummary(f.id, f.name, f.method);
        },

        run: async () => {
            const f = get().flow;
            if (!f || get().running) return;
            if (get().dirty) await get().save();
            const id = f.id;
            set({ running: true, results: [], vars: {}, pendingInput: null });
            const envState = useEnvironments.getState();
            const env = envState.getActive();
            const steps = f.flow?.steps ?? [];
            // An `input` step suspends the run here; we surface a prompt and resolve
            // once the user answers (or cancels). If the user has navigated to
            // another flow, answer "cancel" immediately so the run winds down.
            const requestInput: InputProvider = (req) =>
                new Promise<string | null>((resolve) => {
                    if (get().flow?.id !== id) return resolve(null);
                    set({ pendingInput: { ...req, resolve } });
                });
            await runFlow(
                steps,
                env,
                // Progress lands in the live store only while this flow is on screen;
                // after a switch it goes into the snapshot instead (no cross-talk).
                (u) => {
                    if (get().flow?.id === id) set({ results: u.results, vars: u.vars });
                    else flowCache.patch(id, { results: u.results, vars: u.vars });
                },
                () => get().flow?.id !== id || !get().running,
                envState.applyMutations,
                requestInput,
                useIdentities.getState().resolve,
            );
            if (get().flow?.id === id) set({ running: false, pendingInput: null });
        },

        stop: () => {
            get().pendingInput?.resolve(null); // release a waiting prompt so the run can wind down
            set({ running: false, pendingInput: null });
        },

        submitInput: (value) => {
            const pending = get().pendingInput;
            if (!pending) return;
            pending.resolve(value);
            set({ pendingInput: null });
        },
    };
});

/**
 * Flush a pending autosave for the flow being navigated away from (the same
 * identity-checked pattern as the request editor's flushSave).
 */
function flushSave(draft: HttpRequest, set: (fn: (s: FlowVM) => Partial<FlowVM>) => void): void {
    void requestsRepository
        .save(draft)
        .then((saved) => {
            useCollections.getState().updateSummary(draft.id, draft.name, draft.method);
            const snap = flowCache.get(draft.id);
            if (snap && snap.flow === draft) {
                flowCache.set(draft.id, { ...snap, flow: { ...draft, updated_at: saved.updated_at }, dirty: false });
            }
            set((s) => (s.flow === draft ? { flow: { ...draft, updated_at: saved.updated_at }, dirty: false } : {}));
        })
        .catch(() => {
            /* snapshot stays dirty; the next save will retry */
        });
}
