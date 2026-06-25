// Whether the full-screen Auth Store is showing. The button toggles it; the
// shell swaps the main body for the Auth Store screen when open.
import { create } from "zustand";

interface AuthStoreScreenVM {
    open: boolean;
    toggle: () => void;
    setOpen: (open: boolean) => void;
}

export const useAuthStoreScreen = create<AuthStoreScreenVM>((set, get) => ({
    open: false,
    toggle: () => set({ open: !get().open }),
    setOpen: (open) => set({ open }),
}));
