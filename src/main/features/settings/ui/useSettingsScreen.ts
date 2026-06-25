// Whether the full-screen Settings is showing, and which section. Opened from
// the profile menu; the shell swaps the main body for the Settings screen when
// open (mirrors the Auth Store / Swagger screen pattern).
import { create } from "zustand";

export type SettingsSection =
    | "account"
    | "appearance"
    | "editor"
    | "shortcuts"
    | "notifications"
    | "about"
    | "workspace"
    | "members"
    | "invitations";

interface SettingsScreenVM {
    open: boolean;
    section: SettingsSection;
    show: (section?: SettingsSection) => void;
    setSection: (section: SettingsSection) => void;
    close: () => void;
}

export const useSettingsScreen = create<SettingsScreenVM>((set) => ({
    open: false,
    section: "account",
    show: (section) => set((s) => ({ open: true, section: section ?? s.section })),
    setSection: (section) => set({ section }),
    close: () => set({ open: false }),
}));
