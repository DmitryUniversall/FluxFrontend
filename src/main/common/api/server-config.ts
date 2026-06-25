// Where the Flux backend lives - the absolute base URL prepended to every
// `/api/...` path.
//
// Defaults are chosen per build mode and can be overridden at build time with
// VITE_API_BASE_URL:
//   * local dev (`vite` / `tauri dev`)        -> a backend on this machine (:7887);
//   * a production build (Docker web, desktop) -> the hosted API.
// The desktop build additionally lets the user point at any server from the
// sign-in screen (persisted), which wins over the default.
import { isTauri } from "@/main/common/platform";

const KEY = "flux_server_url";
const DEV_SERVER = "http://localhost:7887";
const PROD_SERVER = "https://api.flux.universallplus.ru";

const normalize = (url: string): string => url.trim().replace(/\/+$/, "");

const defaultServer = (): string => {
    const explicit = import.meta.env.VITE_API_BASE_URL;
    if (explicit !== undefined && explicit !== null) return normalize(explicit);
    return import.meta.env.DEV ? DEV_SERVER : PROD_SERVER;
};

export const serverConfig = {
    /** Absolute base URL prepended to every API path. */
    baseUrl(): string {
        if (isTauri()) return normalize(localStorage.getItem(KEY) ?? "") || defaultServer();
        return defaultServer();
    },
    /** The mode/env default (no desktop override) - handy as a UI placeholder. */
    defaultUrl(): string {
        return defaultServer();
    },
    set(url: string): void {
        localStorage.setItem(KEY, normalize(url));
    },
};
