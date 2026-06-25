// Request console viewmodel. A process-wide ring buffer of recent proxied
// requests, fed from the requests repository (the single send choke point) and
// read by the console panel. Kept in the UI layer but written to imperatively
// via `getState().log`, so non-React code (the repository, the flow runner) can
// record without a hook.
import { create } from "zustand";
import type { ConsoleEntry } from "../domain/models";

const MAX_ENTRIES = 200;
const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

interface ConsoleVM {
    entries: ConsoleEntry[]; // newest first
    open: boolean;
    unseen: number; // logged while the panel was closed (badge)
    log: (entry: Omit<ConsoleEntry, "id">) => void;
    clear: () => void;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

export const useRequestConsole = create<ConsoleVM>((set, get) => ({
    entries: [],
    open: false,
    unseen: 0,

    log: (entry) =>
        set((s) => ({
            entries: [{ ...entry, id: newId() }, ...s.entries].slice(0, MAX_ENTRIES),
            unseen: s.open ? 0 : s.unseen + 1,
        })),

    clear: () => set({ entries: [], unseen: 0 }),

    setOpen: (open) => set({ open, unseen: open ? 0 : get().unseen }),

    toggle: () => {
        const open = !get().open;
        set({ open, unseen: open ? 0 : get().unseen });
    },
}));
