// Admin-side changelog editor viewmodel: the full list of releases (incl. drafts)
// plus the write operations. The editing draft itself lives in the section
// component; this store owns the list and persistence.
import { create } from "zustand";
import { changelogRepository, type ReleaseCreate, type ReleaseUpdate } from "../data/changelog-repository";
import type { Release } from "../domain/models";

interface ChangelogAdminVM {
    releases: Release[];
    loading: boolean;
    loadAll: () => Promise<void>;
    create: (data: ReleaseCreate) => Promise<Release>;
    update: (id: string, data: ReleaseUpdate) => Promise<Release>;
    remove: (id: string) => Promise<void>;
    setPublished: (id: string, published: boolean, banner?: string | null) => Promise<void>;
    reorder: (ids: string[]) => Promise<void>;
}

export const useChangelogAdmin = create<ChangelogAdminVM>((set, get) => ({
    releases: [],
    loading: false,

    loadAll: async () => {
        set({ loading: true });
        try {
            set({ releases: await changelogRepository.listAll(), loading: false });
        } catch {
            set({ loading: false });
        }
    },

    create: async (data) => {
        const release = await changelogRepository.create(data);
        await get().loadAll();
        return release;
    },

    update: async (id, data) => {
        const release = await changelogRepository.update(id, data);
        await get().loadAll();
        return release;
    },

    remove: async (id) => {
        await changelogRepository.remove(id);
        await get().loadAll();
    },

    setPublished: async (id, published, banner) => {
        if (published) await changelogRepository.publish(id, banner ?? null);
        else await changelogRepository.unpublish(id);
        await get().loadAll();
    },

    reorder: async (ids) => {
        set({ releases: await changelogRepository.reorder(ids) });
    },
}));
