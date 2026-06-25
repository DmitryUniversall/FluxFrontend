// Runtime platform check so the web and desktop builds share one codebase.
// Tauri 2 injects __TAURI_INTERNALS__ into every webview it creates; in a
// regular browser the global is absent and every desktop-only branch is off.
export function isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
