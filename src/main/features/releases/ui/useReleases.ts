// Releases viewmodel: the full-screen Downloads / Updates overlays and the
// public downloads config they render. Mirrors the other screen stores (one
// overlay at a time via closeOtherScreens).
import { create } from "zustand";
import { useAdminScreen } from "@/main/features/admin/ui/useAdminScreen";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { releasesRepository } from "../data/releases-repository";
import { EMPTY_DOWNLOADS, type DownloadsConfig } from "../domain/models";

type ReleasesScreen = "downloads" | "updates" | null;

interface ReleasesVM {
    screen: ReleasesScreen;
    downloads: DownloadsConfig;
    loaded: boolean;
    load: () => Promise<void>;
    showDownloads: () => void;
    showUpdates: () => void;
    close: () => void;
}

// Opening a releases screen dismisses the other full-screen overlays (mirrors the
// inverse close elsewhere) so only one is ever visible.
function closeOtherScreens(): void {
    useHelp.getState().closeDocs();
    useSettingsScreen.getState().close();
    useAdminScreen.getState().close();
    useChangelog.getState().close();
    useAuthStoreScreen.getState().setOpen(false);
    useSwaggerImport.getState().close();
}

export const useReleases = create<ReleasesVM>((set, get) => ({
    screen: null,
    downloads: EMPTY_DOWNLOADS,
    loaded: false,

    load: async () => {
        try {
            set({ downloads: await releasesRepository.downloads(), loaded: true });
        } catch {
            // Best-effort: keep whatever we last had.
        }
    },

    showDownloads: () => {
        closeOtherScreens();
        if (!get().loaded) void get().load();
        set({ screen: "downloads" });
    },
    showUpdates: () => {
        closeOtherScreens();
        if (!get().loaded) void get().load();
        set({ screen: "updates" });
    },
    close: () => set({ screen: null }),
}));
