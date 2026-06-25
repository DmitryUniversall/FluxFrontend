import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import { useRequestConsole } from "@/main/features/console/ui/useRequestConsole";
import type { HttpRequest, OutgoingRequest, ProxyResponse } from "../domain/models";
import { sendOutgoing } from "./transport";

export const requestsRepository = {
    get: (id: string) => api.request<HttpRequest>(endpoints.request(id)),
    save: (req: HttpRequest) => api.request<HttpRequest>(endpoints.request(req.id), { method: "PUT", body: req }),
    // The single proxy choke point - both manual sends and flow runs pass through
    // here, so this is where every exchange gets logged to the request console.
    // The transport differs per platform (web proxy vs native Rust on desktop).
    send: async (outgoing: OutgoingRequest) => {
        const at = Date.now();
        const start = performance.now();
        try {
            const res: ProxyResponse = await sendOutgoing(outgoing);
            useRequestConsole.getState().log({
                at,
                method: outgoing.method,
                url: outgoing.url,
                requestHeaders: outgoing.headers,
                requestBody: outgoing.body,
                durationMs: Math.round(performance.now() - start),
                status: res.status,
                statusText: res.status_text,
                responseHeaders: res.headers,
                responseBody: res.body,
                timeMs: res.time_ms,
                sizeBytes: res.size_bytes,
            });
            return res;
        } catch (e) {
            useRequestConsole.getState().log({
                at,
                method: outgoing.method,
                url: outgoing.url,
                requestHeaders: outgoing.headers,
                requestBody: outgoing.body,
                durationMs: Math.round(performance.now() - start),
                error: e instanceof Error ? e.message : String(e),
            });
            throw e;
        }
    },
};

export type RequestsRepository = typeof requestsRepository;
