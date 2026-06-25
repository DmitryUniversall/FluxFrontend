// Expand/collapse state of the sidebar's collection folders. Folders are
// **closed by default** and the state is persisted to localStorage, so the
// tree reopens exactly the way the user left it. Keyed by collection id
// (globally unique), so one map covers every workspace.
import { create } from "zustand";

const KEY = "flux:sidebar-expanded";

const read = (): Record<string, boolean> => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || "{}");
        return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
    } catch {
        return {};
    }
};

interface SidebarState {
    expanded: Record<string, boolean>;
    isExpanded: (id: string) => boolean;
    toggle: (id: string) => void;
    expand: (id: string) => void;
}

export const useSidebarState = create<SidebarState>((set, get) => {
    const persist = () => {
        try {
            localStorage.setItem(KEY, JSON.stringify(get().expanded));
        } catch {
            /* ignore quota / unavailable storage */
        }
    };

    return {
        expanded: read(),
        isExpanded: (id) => !!get().expanded[id],
        toggle: (id) => {
            set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } }));
            persist();
        },
        expand: (id) => {
            if (get().expanded[id]) return;
            set((s) => ({ expanded: { ...s.expanded, [id]: true } }));
            persist();
        },
    };
});
