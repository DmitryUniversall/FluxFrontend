// Identities (auth store) viewmodel. Owns the workspace's stored identities and
// is the resolution point that flattens an identity-typed auth into a concrete
// one for every send path (requests, flows, copy-as-cURL).
import { create } from "zustand";
import type { Auth } from "@/main/features/request-editor/domain/models";
import { identitiesRepository } from "../data/identities-repository";
import { resolveIdentityAuth, type Identity } from "../domain/models";

interface IdentitiesVM {
    identities: Identity[];
    loaded: boolean;
    load: () => Promise<void>;
    create: (name: string) => Promise<Identity>;
    save: (identity: Identity) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setDefault: (id: string) => Promise<void>;
    defaultId: () => string | null;
    resolve: (auth: Auth) => Auth;
}

export const useIdentities = create<IdentitiesVM>((set, get) => ({
    identities: [],
    loaded: false,

    load: async () => {
        const identities = await identitiesRepository.list();
        set({ identities, loaded: true });
    },

    create: async (name) => {
        const identity = await identitiesRepository.create(name);
        set((s) => ({ identities: [...s.identities, identity] }));
        return identity;
    },

    save: async (identity) => {
        const updated = await identitiesRepository.update(identity);
        set((s) => ({ identities: s.identities.map((i) => (i.id === updated.id ? updated : i)) }));
    },

    remove: async (id) => {
        await identitiesRepository.remove(id);
        set((s) => ({ identities: s.identities.filter((i) => i.id !== id) }));
    },

    setDefault: async (id) => {
        const identities = await identitiesRepository.setDefault(id);
        set({ identities });
    },

    defaultId: () => get().identities.find((i) => i.is_default)?.id ?? null,

    resolve: (auth) => resolveIdentityAuth(auth, get().identities, get().defaultId()),
}));
