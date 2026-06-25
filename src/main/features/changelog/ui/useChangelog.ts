// Changelog viewmodel: the full-screen "What's new" overlay with two independent
// channels - the official upstream feed and this server's local releases. Each
// loads independently so one failing never blanks the other.
import { create } from "zustand";
import { ApiError } from "@/core/http/http-client";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { useAdminScreen } from "@/main/features/admin/ui/useAdminScreen";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { useReleases } from "@/main/features/releases/ui/useReleases";
import { changelogRepository } from "../data/changelog-repository";
import type { Release, UpstreamChangelog } from "../domain/models";

interface ChangelogVM {
    open: boolean;
    local: Release[];
    upstream: UpstreamChangelog | null;
    loadingLocal: boolean;
    loadingUpstream: boolean;
    error: string | null;
    show: () => void;
    close: () => void;
    load: () => Promise<void>;
}

// Opening the changelog dismisses the other full-screen overlays (mirrors the
// inverse close in TopBar) so only one is ever visible.
function closeOtherScreens(): void {
    useHelp.getState().closeDocs();
    useSettingsScreen.getState().close();
    useAdminScreen.getState().close();
    useAuthStoreScreen.getState().setOpen(false);
    useSwaggerImport.getState().close();
    useReleases.getState().close();
}

export const useChangelog = create<ChangelogVM>((set) => ({
    open: false,
    local: [],
    upstream: null,
    loadingLocal: false,
    loadingUpstream: false,
    error: null,

    show: () => {
        closeOtherScreens();
        set({ open: true });
    },
    close: () => set({ open: false }),

    load: async () => {
        set({ loadingLocal: true, loadingUpstream: true, error: null });
        // The two channels are independent: a failure in one is contained.
        void changelogRepository.list().then(
            (local) => set({ local, loadingLocal: false }),
            (e) =>
                set({
                    loadingLocal: false,
                    error: e instanceof ApiError ? e.message : "Couldn't load release notes",
                }),
        );
        void changelogRepository.upstream().then(
            (upstream) => set({ upstream, loadingUpstream: false }),
            () => set({ upstream: { releases: [], available: true, stale: true }, loadingUpstream: false }),
        );
    },
}));
