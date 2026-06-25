// Whether the full-screen Swagger / OpenAPI import is showing, and which
// collection (if any) it was opened from. The shell swaps the main body for the
// import screen when open - mirrors the Auth Store screen pattern.
import { create } from "zustand";

interface SwaggerImportVM {
    open: boolean;
    // Collection the import was launched from (preselected as the destination).
    // null means "no preselection" -> defaults to creating a new collection.
    collectionId: string | null;
    // A spec to pre-fill the editor with (used by the onboarding import tutorial).
    // The screen consumes it once on open, then clears it.
    presetSpec: string | null;
    openFor: (collectionId?: string | null) => void;
    /** Open with the spec textarea pre-filled (the guide auto-fills a sample). */
    openWith: (spec: string, collectionId?: string | null) => void;
    consumePreset: () => void;
    close: () => void;
}

export const useSwaggerImport = create<SwaggerImportVM>((set) => ({
    open: false,
    collectionId: null,
    presetSpec: null,
    openFor: (collectionId = null) => set({ open: true, collectionId: collectionId ?? null, presetSpec: null }),
    openWith: (spec, collectionId = null) => set({ open: true, collectionId: collectionId ?? null, presetSpec: spec }),
    consumePreset: () => set({ presetSpec: null }),
    close: () => set({ open: false }),
}));
