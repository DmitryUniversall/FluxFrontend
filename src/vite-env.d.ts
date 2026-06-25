/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Overrides the API server base URL (e.g. "http://localhost:7887"). When
    // unset, the client falls back to a per-mode default (see api-client.ts).
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Injected by Vite `define` from package.json (see vite.config.ts).
declare const __APP_VERSION__: string;
