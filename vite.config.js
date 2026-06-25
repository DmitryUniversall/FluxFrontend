import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";
// Single source of the frontend version: package.json, injected at build time.
var pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
        alias: { "@": path.resolve(__dirname, "src") },
    },
    // Tauri watches cargo output in the same terminal - don't wipe it.
    clearScreen: false,
    server: {
        port: 5173,
        // `tauri dev` points its webview at exactly this port; fail fast instead of
        // silently hopping to 5174 and leaving the desktop window blank.
        strictPort: true,
        host: true,
        // No /api proxy: the client targets an absolute API base (see server-config),
        // which defaults to http://localhost:7887 in dev. Override with VITE_API_BASE_URL.
    },
});
