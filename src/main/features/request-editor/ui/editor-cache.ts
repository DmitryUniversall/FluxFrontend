// Per-request editor state cache.
//
// Switching between requests in the sidebar used to reset the editor: the
// response, console logs, test results and even sub-600ms unsaved keystrokes
// were lost, and every switch showed a loading spinner. This module keeps a
// snapshot per request id so coming back restores the exact state instantly
// (no fetch, no flicker); freshness against collaborators is reconciled in the
// background by the stores.
//
// Deliberately a leaf module (type-only imports) so both the request editor
// and the collections store can use it without an import cycle.
import type { AssertResult, ResponseView } from "@/main/features/scripting/domain/context";
import type { HttpRequest } from "../domain/models";
import type { StepResult } from "@/main/features/flow/domain/runner";

export interface RequestSnapshot {
    request: HttpRequest;
    dirty: boolean;
    response: ResponseView | null;
    logs: string[];
    tests: AssertResult[];
    error: string | null;
}

export interface FlowSnapshot {
    flow: HttpRequest;
    dirty: boolean;
    results: StepResult[];
    vars: Record<string, string>;
}

function makeCache<T>() {
    const map = new Map<string, T>();
    return {
        get: (id: string) => map.get(id),
        set: (id: string, snap: T) => void map.set(id, snap),
        patch: (id: string, partial: Partial<T>) => {
            const cur = map.get(id);
            if (cur) map.set(id, { ...cur, ...partial });
        },
        remove: (id: string) => void map.delete(id),
        clear: () => map.clear(),
    };
}

/** Snapshots of HTTP request editors, keyed by request id. */
export const requestCache = makeCache<RequestSnapshot>();

/** Snapshots of flow editors (steps + last run results), keyed by flow id. */
export const flowCache = makeCache<FlowSnapshot>();

/** Drop every snapshot (workspace switch / logout). */
export function clearEditorCaches(): void {
    requestCache.clear();
    flowCache.clear();
}
