// The guide engine, modelled as a viewmodel/store like the rest of the app.
// Holds the running tour and the current step index; everything visual lives in
// <GuideLayer/>, which reads this store. Imperative entry points are exposed via
// the `guide` helper so any feature can start a tour or fire a signal.
import { create } from "zustand";
import { guideBus } from "../domain/guide-bus";
import type { Tour, TourStep } from "../domain/types";

type EndReason = "complete" | "skip";

interface GuideVM {
    tour: Tour | null;
    index: number;
    running: boolean;

    start: (tour: Tour) => void;
    next: () => void;
    back: () => void;
    goTo: (index: number) => void;
    end: (reason?: EndReason) => void;
    signal: (name: string) => void;

    /** The active step, or null when no tour is running. */
    current: () => TourStep | null;
}

export const useGuide = create<GuideVM>((set, get) => ({
    tour: null,
    index: 0,
    running: false,

    start: (tour) => {
        if (tour.steps.length === 0) return;
        // If a tour is already running, end it as skipped before swapping.
        if (get().running) get().end("skip");
        set({ tour, index: 0, running: true });
    },

    next: () => {
        const { tour, index, running } = get();
        if (!running || !tour) return;
        if (index >= tour.steps.length - 1) {
            get().end("complete");
            return;
        }
        set({ index: index + 1 });
    },

    back: () => {
        const { running } = get();
        if (!running) return;
        set((s) => ({ index: Math.max(0, s.index - 1) }));
    },

    goTo: (index) => {
        const { tour, running } = get();
        if (!running || !tour) return;
        set({ index: Math.min(Math.max(0, index), tour.steps.length - 1) });
    },

    end: (reason = "skip") => {
        const { tour } = get();
        set({ running: false, tour: null, index: 0 });
        if (!tour) return;
        if (reason === "complete") tour.onComplete?.();
        else tour.onSkip?.();
    },

    signal: (name) => guideBus.emit(name),

    current: () => {
        const { tour, index, running } = get();
        return running && tour ? (tour.steps[index] ?? null) : null;
    },
}));

/** Imperative facade for app code that shouldn't depend on the store shape. */
export const guide = {
    start: (tour: Tour) => useGuide.getState().start(tour),
    signal: (name: string) => useGuide.getState().signal(name),
    end: () => useGuide.getState().end("skip"),
    isRunning: () => useGuide.getState().running,
};
