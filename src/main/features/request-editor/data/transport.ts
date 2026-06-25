// Transport for the actual outgoing API call (the request the user composed).
//
// Web build: relayed through the backend proxy (`POST /api/v2/proxy`) so the
// browser never hits CORS.
// Desktop build: performed natively in Rust (`send_http` command, reqwest) -
// requests originate from the user's machine, so localhost / VPN / private
// hosts are reachable directly, with no CORS and no Docker host rewriting.
//
// Both transports speak the exact same OutgoingRequest/ProxyResponse contract,
// so everything above this module (send pipeline, flow runner, console) is
// completely transport-agnostic.
import { invoke } from "@tauri-apps/api/core";
import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import { isTauri } from "@/main/common/platform";
import type { OutgoingRequest, ProxyResponse } from "../domain/models";

export async function sendOutgoing(outgoing: OutgoingRequest): Promise<ProxyResponse> {
    if (isTauri()) {
        try {
            return await invoke<ProxyResponse>("send_http", { req: outgoing });
        } catch (e) {
            // Command errors arrive as plain strings - normalize to Error so the
            // console/UI render them the same way as web proxy failures.
            throw e instanceof Error ? e : new Error(String(e));
        }
    }
    return api.request<ProxyResponse>(endpoints.proxy, { method: "POST", body: outgoing });
}
