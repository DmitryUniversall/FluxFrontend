// Orchestrates the help/onboarding entry points: the post-registration offer,
// the follow-up offer, the documentation screen, and launching tours. The
// "center" the "?" menu, the registration flow and the per-screen help buttons
// all talk to.
import { create } from "zustand";
import { toast } from "@/main/common/ui/toast";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import {
    createAuthStoreSandbox,
    createFlowSandbox,
    createOnboardingWorkspace,
    createRequestSandbox,
} from "../data/seed";
import type { Tour } from "../domain/types";
import { buildMainTour } from "../tours/onboarding";
import { buildAuthStoreTour, buildFlowTour, buildRequestTour, collaborationTour, importTour } from "../tours/scoped";
import { guide } from "./useGuide";

// The follow-up tours form a chain offered one after another, each via a modal:
// main onboarding -> import -> collaboration -> auth store.
type Offer = "onboarding" | "import" | "collaboration" | "authStore" | null;

interface HelpVM {
    offer: Offer;
    docsOpen: boolean;
    busy: boolean;
    // A scoped tutorial waiting for the user to confirm (the "?" buttons ask first).
    // `run` launches it (some tours create a sandbox first, so it can be async).
    pendingTour: { title: string; run: () => void | Promise<void> } | null;
    offerOnboarding: () => void;
    offerImport: () => void;
    offerCollaboration: () => void;
    offerAuthStore: () => void;
    dismissOffer: () => void;
    openDocs: () => void;
    closeDocs: () => void;
    startOnboarding: () => Promise<void>;
    startImportTour: () => void;
    startCollaborationTour: () => void;
    startAuthStoreTour: () => Promise<void>;
    startTour: (tour: Tour) => void;
    startFlowTour: () => Promise<void>;
    startRequestTour: () => Promise<void>;
    askTour: (title: string, run: () => void | Promise<void>) => void;
    confirmPendingTour: () => void;
    cancelPendingTour: () => void;
}

// Get back to the request workspace so a freshly-launched tour isn't hidden
// behind a full-screen overlay (settings / import / auth store / docs).
function closeFullscreens(): void {
    useSettingsScreen.getState().close();
    useSwaggerImport.getState().close();
    useAuthStoreScreen.getState().setOpen(false);
}

export const useHelp = create<HelpVM>((set, get) => ({
    offer: null,
    docsOpen: false,
    busy: false,
    pendingTour: null,

    offerOnboarding: () => set({ offer: "onboarding" }),
    offerImport: () => set({ offer: "import" }),
    offerCollaboration: () => set({ offer: "collaboration" }),
    offerAuthStore: () => set({ offer: "authStore" }),
    dismissOffer: () => set({ offer: null }),
    openDocs: () => set({ docsOpen: true }),
    closeDocs: () => set({ docsOpen: false }),

    startOnboarding: async () => {
        if (get().busy) return;
        set({ busy: true, offer: null, docsOpen: false });
        closeFullscreens();
        try {
            const seed = await createOnboardingWorkspace();
            guide.start(buildMainTour(seed, { onComplete: () => get().offerImport() }));
        } catch {
            toast.error("Couldn't set up the onboarding workspace. Please try again.");
        } finally {
            set({ busy: false });
        }
    },

    // The follow-up chain: each tour, on completion, offers the next via a modal.
    startImportTour: () => {
        set({ offer: null, docsOpen: false });
        closeFullscreens(); // the first step reopens the import screen with a sample
        guide.start({ ...importTour, onComplete: () => get().offerCollaboration() });
    },
    startCollaborationTour: () => {
        set({ offer: null, docsOpen: false });
        closeFullscreens(); // the first step opens Workspace settings -> Members
        guide.start({ ...collaborationTour, onComplete: () => get().offerAuthStore() });
    },
    startAuthStoreTour: async () => {
        if (get().busy) return;
        set({ busy: true, offer: null, docsOpen: false });
        try {
            const sandbox = await createAuthStoreSandbox();
            guide.start(buildAuthStoreTour(sandbox));
        } catch {
            toast.error("Couldn't set up the auth store sandbox. Please try again.");
        } finally {
            set({ busy: false });
        }
    },

    startTour: (tour) => {
        set({ offer: null, docsOpen: false });
        guide.start(tour);
    },

    // Feature tours that build a small sandbox first (in the current workspace).
    startFlowTour: async () => {
        if (get().busy) return;
        set({ busy: true });
        closeFullscreens();
        try {
            const sandbox = await createFlowSandbox();
            guide.start(buildFlowTour(sandbox));
        } catch {
            toast.error("Couldn't set up the flow sandbox. Please try again.");
        } finally {
            set({ busy: false });
        }
    },
    startRequestTour: async () => {
        if (get().busy) return;
        set({ busy: true });
        closeFullscreens();
        try {
            const sandbox = await createRequestSandbox();
            guide.start(buildRequestTour(sandbox));
        } catch {
            toast.error("Couldn't set up the request sandbox. Please try again.");
        } finally {
            set({ busy: false });
        }
    },

    // The per-screen "?" buttons ask first, then launch on confirm.
    askTour: (title, run) => set({ pendingTour: { title, run } }),
    confirmPendingTour: () => {
        const pending = get().pendingTour;
        set({ pendingTour: null });
        if (pending) void pending.run();
    },
    cancelPendingTour: () => set({ pendingTour: null }),
}));
