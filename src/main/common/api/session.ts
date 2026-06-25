// Session rotation: trades the refresh token for a fresh access/refresh pair
// when the access token expires. Wired into `api` as the 401 handler.
//
// Two things make this safe against the backend's reuse-detection (replaying an
// already-rotated refresh token kills the whole session):
//   * single-flight - concurrent 401s share ONE refresh call, so a burst of
//     requests can't each spend the same refresh token and trip reuse-detection;
//   * a bare client (no token header, no 401 hook) issues the refresh, so a
//     failed refresh can't recurse back into itself.
import { HttpClient } from "@/core/http/http-client";
import { endpoints } from "./endpoints";
import { serverConfig } from "./server-config";
import { tokenStorage } from "./token-storage";

interface TokenPair {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

const bare = new HttpClient(() => serverConfig.baseUrl());

let inflight: Promise<boolean> | null = null;

/** Rotate the token pair. Resolves true on success (caller should retry). */
export function refreshSession(): Promise<boolean> {
    if (!inflight) inflight = rotate().finally(() => (inflight = null));
    return inflight;
}

async function rotate(): Promise<boolean> {
    const refresh_token = tokenStorage.getRefresh();
    if (!refresh_token) return false;
    try {
        const pair = await bare.request<TokenPair>(endpoints.refresh, {
            method: "POST",
            body: { refresh_token },
        });
        tokenStorage.set(pair.access_token, pair.refresh_token);
        return true;
    } catch {
        // Refresh token expired/revoked (or reuse detected): the session is gone.
        tokenStorage.clear();
        return false;
    }
}
