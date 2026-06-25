// Admin dashboard viewmodel: whether the full-screen is open, the active section,
// and the data each section needs. The shell swaps the body for AdminScreen when
// open (mirrors Settings/Docs). Sections load lazily; Overview also auto-refreshes.
import { create } from "zustand";
import { ApiError } from "@/core/http/http-client";
import type { DownloadsConfig } from "@/main/features/releases/domain/models";
import { adminRepository, type RoleWrite } from "../data/admin-repository";
import type {
    AdminSettings,
    AdminUser,
    EffectiveConfig,
    Overview,
    Permission,
    Role,
    TimeseriesPoint,
} from "../domain/models";
import { useInstanceMeta } from "./useInstanceMeta";

export type AdminSection = "overview" | "settings" | "roles" | "users" | "changelog" | "downloads";

interface AdminScreenVM {
    open: boolean;
    section: AdminSection;
    overview: Overview | null;
    timeseries: TimeseriesPoint[];
    settings: AdminSettings | null;
    config: EffectiveConfig | null;
    downloads: DownloadsConfig | null;
    roles: Role[];
    permissions: Permission[];
    users: AdminUser[];
    loading: boolean;
    error: string | null;
    show: (section?: AdminSection) => void;
    setSection: (section: AdminSection) => void;
    close: () => void;
    loadOverview: () => Promise<void>;
    loadSettings: () => Promise<void>;
    loadDownloads: () => Promise<void>;
    loadRoles: () => Promise<void>;
    loadUsers: (query?: string) => Promise<void>;
    saveSettings: (settings: AdminSettings) => Promise<void>;
    saveDownloads: (config: DownloadsConfig) => Promise<void>;
    createRole: (role: RoleWrite) => Promise<void>;
    updateRole: (id: string, role: RoleWrite) => Promise<void>;
    deleteRole: (id: string) => Promise<void>;
    setUserRole: (id: string, roleId: string) => Promise<void>;
}

function message(e: unknown, fallback: string): string {
    return e instanceof ApiError ? e.message : fallback;
}

export const useAdminScreen = create<AdminScreenVM>((set, get) => ({
    open: false,
    section: "overview",
    overview: null,
    timeseries: [],
    settings: null,
    config: null,
    downloads: null,
    roles: [],
    permissions: [],
    users: [],
    loading: false,
    error: null,

    show: (section) => set((s) => ({ open: true, section: section ?? s.section })),
    setSection: (section) => set({ section, error: null }),
    close: () => set({ open: false }),

    loadOverview: async () => {
        set({ loading: true, error: null });
        try {
            const [overview, timeseries] = await Promise.all([adminRepository.overview(), adminRepository.metrics()]);
            set({ overview, timeseries, loading: false });
        } catch (e) {
            set({ loading: false, error: message(e, "Could not load admin data") });
        }
    },

    loadSettings: async () => {
        set({ loading: true, error: null });
        try {
            const [settings, config] = await Promise.all([adminRepository.settings(), adminRepository.config()]);
            set({ settings, config, loading: false });
        } catch (e) {
            set({ loading: false, error: message(e, "Could not load settings") });
        }
    },

    loadDownloads: async () => {
        set({ loading: true, error: null });
        try {
            set({ downloads: await adminRepository.downloads(), loading: false });
        } catch (e) {
            set({ loading: false, error: message(e, "Could not load downloads") });
        }
    },

    loadRoles: async () => {
        set({ loading: true, error: null });
        try {
            const [roles, permissions] = await Promise.all([adminRepository.roles(), adminRepository.permissions()]);
            set({ roles, permissions, loading: false });
        } catch (e) {
            set({ loading: false, error: message(e, "Could not load roles") });
        }
    },

    loadUsers: async (query) => {
        set({ loading: true, error: null });
        try {
            // Roles back the assignment dropdown; fetch them once alongside users.
            const [users, roles] = await Promise.all([
                adminRepository.users(query),
                get().roles.length ? Promise.resolve(get().roles) : adminRepository.roles(),
            ]);
            set({ users, roles, loading: false });
        } catch (e) {
            set({ loading: false, error: message(e, "Could not load users") });
        }
    },

    saveSettings: async (settings) => {
        const saved = await adminRepository.saveSettings(settings);
        set({ settings: saved });
        // The shell banner / maintenance gate read /meta - refresh it.
        void useInstanceMeta.getState().load();
    },

    saveDownloads: async (config) => {
        const saved = await adminRepository.saveDownloads(config);
        set({ downloads: saved });
        // /meta carries the version thresholds + verdict - refresh it.
        void useInstanceMeta.getState().load();
    },

    createRole: async (role) => {
        await adminRepository.createRole(role);
        await get().loadRoles();
    },

    updateRole: async (id, role) => {
        await adminRepository.updateRole(id, role);
        await get().loadRoles();
    },

    deleteRole: async (id) => {
        await adminRepository.deleteRole(id);
        await get().loadRoles();
    },

    setUserRole: async (id, roleId) => {
        const updated = await adminRepository.setUserRole(id, roleId);
        set((s) => ({ users: s.users.map((u) => (u.id === updated.id ? updated : u)) }));
    },
}));
