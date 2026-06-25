// "What's new" indicator: tracks whether there's an unseen latest release on
// either channel (official upstream / this server), compared against the last
// version the user saw (localStorage). Opening the changelog marks them seen.
import { create } from "zustand";
import { changelogRepository } from "../data/changelog-repository";

const SEEN_LOCAL = "flux.changelog.seen.local";
const SEEN_OFFICIAL = "flux.changelog.seen.official";

interface SeenVersions {
    local: string | null;
    official: string | null;
}

interface WhatsNewVM {
    hasUnseen: boolean;
    latest: SeenVersions;
    check: () => Promise<void>;
    markSeen: (latest?: SeenVersions) => void;
}

export const useWhatsNew = create<WhatsNewVM>((set, get) => ({
    hasUnseen: false,
    latest: { local: null, official: null },

    check: async () => {
        const [local, upstream] = await Promise.all([
            changelogRepository.latest().catch(() => null),
            changelogRepository.upstream().catch(() => null),
        ]);
        const latest: SeenVersions = {
            local: local?.version ?? null,
            official:
                upstream && upstream.available && upstream.releases.length > 0 ? upstream.releases[0].version : null,
        };
        const unseen =
            (latest.local !== null && latest.local !== localStorage.getItem(SEEN_LOCAL)) ||
            (latest.official !== null && latest.official !== localStorage.getItem(SEEN_OFFICIAL));
        set({ latest, hasUnseen: unseen });
    },

    markSeen: (latest) => {
        const versions = latest ?? get().latest;
        if (versions.local) localStorage.setItem(SEEN_LOCAL, versions.local);
        if (versions.official) localStorage.setItem(SEEN_OFFICIAL, versions.official);
        set({ hasUnseen: false, latest: { ...get().latest, ...versions } });
    },
}));
