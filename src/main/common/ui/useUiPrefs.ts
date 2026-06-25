// Browser-local UI preferences (persisted to localStorage). These are the
// settings that only make sense per-device - appearance, editor behaviour and
// notification display - as opposed to account/workspace data, which lives on
// the server. The Settings screen is the single editing surface; features read
// the values directly (live for most, default-only where noted).
import { create } from "zustand";

const KEY = "flux:ui-prefs";

export type ResponseView = "tree" | "raw";

interface Persisted {
    /** Default body view when a response first renders (Tree vs Raw). */
    responseView: ResponseView;
    /** Wrap long lines in the raw response / body view instead of scrolling. */
    wrapResponse: boolean;
    /** Always open the run form before sending, even when params have defaults. */
    runFormByDefault: boolean;
    /** Toast when a collaborator's change to the open request is pulled in. */
    collaboratorToasts: boolean;
    /** Show the unread count badge on the notifications bell. */
    unreadBadge: boolean;
}

interface UiPrefs extends Persisted {
    set: <K extends keyof Persisted>(key: K, value: Persisted[K]) => void;
}

const DEFAULTS: Persisted = {
    responseView: "tree",
    wrapResponse: true,
    runFormByDefault: false,
    collaboratorToasts: true,
    unreadBadge: true,
};

const read = (): Persisted => {
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
        return { ...DEFAULTS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
        return { ...DEFAULTS };
    }
};

export const useUiPrefs = create<UiPrefs>((set, get) => ({
    ...read(),
    set: (key, value) => {
        set({ [key]: value } as Pick<Persisted, typeof key>);
        try {
            const { set: _omit, ...persisted } = get();
            localStorage.setItem(KEY, JSON.stringify({ ...persisted, [key]: value }));
        } catch {
            /* ignore quota / unavailable storage */
        }
    },
}));
