// Layout state for the workspace shell - which panels are collapsed and where
// the request/response splitter sits. Persisted to localStorage so the app
// reopens the way the user left it. Variables start collapsed by default.
import { create } from "zustand";

const KEY = "flux:layout";

interface LayoutState {
    sidebarCollapsed: boolean;
    varsCollapsed: boolean;
    responseCollapsed: boolean;
    topFrac: number;
    toggleSidebar: () => void;
    toggleVars: () => void;
    toggleResponse: () => void;
    setTopFrac: (f: number) => void;
}

type Persisted = Pick<LayoutState, "sidebarCollapsed" | "varsCollapsed" | "responseCollapsed" | "topFrac">;

const read = (): Partial<Persisted> => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
        return {};
    }
};

export const useLayout = create<LayoutState>((set, get) => {
    const saved = read();
    const persist = () => {
        const s = get();
        try {
            localStorage.setItem(
                KEY,
                JSON.stringify({
                    sidebarCollapsed: s.sidebarCollapsed,
                    varsCollapsed: s.varsCollapsed,
                    responseCollapsed: s.responseCollapsed,
                    topFrac: s.topFrac,
                } satisfies Persisted),
            );
        } catch {
            /* ignore quota / unavailable storage */
        }
    };

    return {
        sidebarCollapsed: saved.sidebarCollapsed ?? false,
        varsCollapsed: saved.varsCollapsed ?? true, // collapsed by default
        responseCollapsed: saved.responseCollapsed ?? false,
        topFrac: saved.topFrac ?? 0.5,
        toggleSidebar: () => {
            set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
            persist();
        },
        toggleVars: () => {
            set((s) => ({ varsCollapsed: !s.varsCollapsed }));
            persist();
        },
        toggleResponse: () => {
            set((s) => ({ responseCollapsed: !s.responseCollapsed }));
            persist();
        },
        setTopFrac: (f) => {
            set({ topFrac: f });
            persist();
        },
    };
});
