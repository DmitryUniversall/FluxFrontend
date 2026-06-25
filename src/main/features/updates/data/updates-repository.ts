import { api } from "@/main/common/api/api-client";

// One-topic-per-concern cursor returned by the long-poll endpoint. `ws` is
// absent when polling without an active workspace.
export interface UpdatesCursor {
    notif: number;
    ws?: number;
}

interface PollArgs {
    workspaceId?: string | null;
    notif?: number | null;
    ws?: number | null;
    signal?: AbortSignal;
}

export const updatesRepository = {
    // Holds open on the server until something changes or the hold elapses.
    poll: ({ workspaceId, notif, ws, signal }: PollArgs) => {
        const params = new URLSearchParams();
        if (workspaceId) params.set("workspace_id", workspaceId);
        if (notif != null) params.set("notif", String(notif));
        if (ws != null) params.set("ws", String(ws));
        const query = params.toString();
        return api.request<UpdatesCursor>(`/api/v2/updates${query ? `?${query}` : ""}`, { signal });
    },
};
