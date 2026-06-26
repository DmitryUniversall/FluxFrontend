// A drop-in RequestsRepository for the public landing demos. It has the exact
// shape sendRequest() and runFlow() expect, but:
//   * send()  -> the PUBLIC preview proxy (no auth, IP rate-limited, locked to
//                the guide sandbox on the backend);
//   * get(id) -> the in-memory demo requests (flow Call steps fetch by id);
//   * save()  -> a no-op (the demo never persists anything).
// This keeps the demos on the real send pipeline without touching the app's
// authenticated repository.
import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { RequestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type { HttpRequest, OutgoingRequest, ProxyResponse } from "@/main/features/request-editor/domain/models";
import { demoRequests } from "./demoData";

export const previewRepository: RequestsRepository = {
    get: async (id: string): Promise<HttpRequest> => {
        const req = demoRequests[id];
        if (!req) throw new Error("Demo request not found");
        return req;
    },
    save: async (req: HttpRequest): Promise<HttpRequest> => req,
    send: (outgoing: OutgoingRequest): Promise<ProxyResponse> =>
        api.request<ProxyResponse>(endpoints.proxyPreview, { method: "POST", body: outgoing }),
};
