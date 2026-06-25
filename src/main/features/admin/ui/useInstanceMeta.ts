// Public instance metadata (/api/v2/meta): app version, whether registration is
// open, the maintenance flag and any active banner. Unauthenticated, so the shell
// and the sign-in screen can both read it. Refreshed after an admin edits settings.
import { create } from "zustand";
import { adminRepository } from "../data/admin-repository";
import type { MetaInfo } from "../domain/models";

interface InstanceMetaVM {
    meta: MetaInfo | null;
    load: () => Promise<void>;
}

export const useInstanceMeta = create<InstanceMetaVM>((set) => ({
    meta: null,
    load: async () => {
        try {
            set({ meta: await adminRepository.meta() });
        } catch {
            // /meta is best-effort: on failure keep whatever we last had.
        }
    },
}));
