// Live-updates driver: a single long-poll loop that replaces short polling.
// It holds one request open on the server and reacts only when something
// actually changes - new notifications, or any collection/request change in the
// active workspace - then immediately reconnects with the new cursor.
import { useEffect, useRef } from "react";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { useWhatsNew } from "@/main/features/changelog/ui/useWhatsNew";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useNotifications } from "@/main/features/notifications/ui/useNotifications";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { updatesRepository } from "@/main/features/updates/data/updates-repository";

const BACKOFF_MS = 3000;

export function useLiveUpdates() {
    const activeWorkspaceId = useWorkspaces((s) => s.activeId);
    const wsIdRef = useRef(activeWorkspaceId);
    // Cursor persists across reconnects. `notif` survives workspace switches;
    // `ws` is reset on switch so the new workspace re-baselines.
    const cursorRef = useRef<{ notif: number | null; ws: number | null }>({ notif: null, ws: null });
    const abortRef = useRef<AbortController | null>(null);

    // On workspace switch: rebaseline the ws cursor and abort the in-flight poll
    // so the loop restarts immediately against the new workspace.
    useEffect(() => {
        wsIdRef.current = activeWorkspaceId;
        cursorRef.current.ws = null;
        abortRef.current?.abort();
    }, [activeWorkspaceId]);

    useEffect(() => {
        let stopped = false;

        const loop = async () => {
            while (!stopped) {
                const controller = new AbortController();
                abortRef.current = controller;
                const prev = cursorRef.current;
                try {
                    const res = await updatesRepository.poll({
                        workspaceId: wsIdRef.current,
                        notif: prev.notif,
                        ws: prev.ws,
                        signal: controller.signal,
                    });
                    if (stopped) break;

                    // Only refresh a concern when its version actually moved past a known
                    // baseline (null cursor means "just adopting", don't refetch).
                    if (prev.notif !== null && res.notif !== prev.notif) {
                        void useNotifications.getState().refresh();
                        // A new notification may be a release announcement - refresh the
                        // "what's new" badge and any banner the announcement raised.
                        void useWhatsNew.getState().check();
                        void useInstanceMeta.getState().load();
                    }
                    if (prev.ws !== null && typeof res.ws === "number" && res.ws !== prev.ws) {
                        void useCollections.getState().refresh();
                        void useRequestEditor.getState().pollRemote();
                    }
                    cursorRef.current = { notif: res.notif, ws: typeof res.ws === "number" ? res.ws : null };
                } catch {
                    if (stopped) break;
                    // Aborted (workspace switch) -> reconnect now; otherwise a network
                    // hiccup -> brief back-off before retrying.
                    if (controller.signal.aborted) continue;
                    await new Promise((r) => setTimeout(r, BACKOFF_MS));
                }
            }
        };

        void loop();
        return () => {
            stopped = true;
            abortRef.current?.abort();
        };
    }, []);
}
