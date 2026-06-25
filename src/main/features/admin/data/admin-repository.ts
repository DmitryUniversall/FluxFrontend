import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { DownloadsConfig } from "@/main/features/releases/domain/models";
import type {
    AdminSettings,
    AdminUser,
    EffectiveConfig,
    MetaInfo,
    Overview,
    Permission,
    Role,
    TimeseriesPoint,
} from "../domain/models";

export interface RoleWrite {
    name: string;
    description: string;
    permissions: string[];
    is_default?: boolean;
}

export const adminRepository = {
    overview: () => api.request<Overview>(endpoints.adminOverview),
    metrics: () => api.request<TimeseriesPoint[]>(endpoints.adminMetrics),
    meta: () => api.request<MetaInfo>(endpoints.meta),

    settings: () => api.request<AdminSettings>(endpoints.adminSettings),
    saveSettings: (settings: AdminSettings) =>
        api.request<AdminSettings>(endpoints.adminSettings, { method: "PUT", body: settings }),
    config: () => api.request<EffectiveConfig>(endpoints.adminConfig),

    downloads: () => api.request<DownloadsConfig>(endpoints.adminDownloads),
    saveDownloads: (config: DownloadsConfig) =>
        api.request<DownloadsConfig>(endpoints.adminDownloads, { method: "PUT", body: config }),

    permissions: () => api.request<Permission[]>(endpoints.adminPermissions),
    roles: () => api.request<Role[]>(endpoints.adminRoles),
    createRole: (role: RoleWrite) => api.request<Role>(endpoints.adminRoles, { method: "POST", body: role }),
    updateRole: (id: string, role: RoleWrite) =>
        api.request<Role>(endpoints.adminRole(id), { method: "PUT", body: role }),
    deleteRole: (id: string) => api.request<void>(endpoints.adminRole(id), { method: "DELETE" }),

    users: (query?: string) => api.request<AdminUser[]>(endpoints.adminUsers(query)),
    setUserRole: (id: string, roleId: string) =>
        api.request<AdminUser>(endpoints.adminUserRole(id), { method: "PUT", body: { role_id: roleId } }),
};

export type AdminRepository = typeof adminRepository;
