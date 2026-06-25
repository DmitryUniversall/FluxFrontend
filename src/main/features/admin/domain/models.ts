// Admin dashboard models. Mirror the backend admin entities (overview + metrics).

export interface SystemInfo {
    version: string;
    storage_backend: string;
    redis_enabled: boolean;
    uptime_seconds: number;
}

export interface Counts {
    users: number;
    roles: number;
    workspaces: number;
    collections: number;
    requests: number;
    environments: number;
    identities: number;
    notifications: number;
    invitations: number;
}

export interface RouteStat {
    method: string;
    path: string;
    count: number;
    errors: number;
    avg_ms: number;
}

export interface MetricsSnapshot {
    total_requests: number;
    status_classes: Record<string, number>;
    p50_ms: number;
    p95_ms: number;
    rps_1m: number;
    error_rate: number;
    top_routes: RouteStat[];
}

export interface Overview {
    system: SystemInfo;
    counts: Counts;
    metrics: MetricsSnapshot;
}

export interface TimeseriesPoint {
    minute: number;
    requests: number;
    errors: number;
    avg_ms: number;
}

export type AnnouncementLevel = "info" | "warn" | "critical";

export interface Announcement {
    text: string;
    level: AnnouncementLevel;
    enabled: boolean;
    // Whether users may dismiss the banner (sticky banners can't be closed).
    dismissible: boolean;
    // Optional active window (ISO-8601 UTC). null = no bound on that side.
    starts_at: string | null;
    ends_at: string | null;
}

export type ClientCompatStatus = "ok" | "update_recommended" | "update_required";

export interface ClientCompat {
    status: ClientCompatStatus;
    platform: string;
    version: string;
}

export interface MetaInfo {
    version: string;
    // API contract version (the /api/v2 boundary), distinct from the release above.
    api_version: number;
    registration_enabled: boolean;
    maintenance_mode: boolean;
    maintenance_message: string;
    announcement: Announcement | null;
    // Desktop update thresholds (operator-set); empty = no check.
    latest_app_version: string;
    min_app_version: string;
    // Verdict for the client that made the request (null when not applicable).
    client: ClientCompat | null;
}

// Runtime, operator-tunable settings (GET/PUT /admin/settings).
export interface AdminSettings {
    registration_enabled: boolean;
    maintenance_mode: boolean;
    maintenance_message: string;
    announcement: Announcement | null;
}

// Read-only, curated config view (the backend only sends non-sensitive facts).
export interface ConfigEntry {
    key: string;
    value: string;
}

export interface ConfigSection {
    name: string;
    entries: ConfigEntry[];
}

export interface EffectiveConfig {
    sections: ConfigSection[];
}

// RBAC: the permission catalog, roles and the admin user projection.
export interface Permission {
    key: string;
    label: string;
    group: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    is_system: boolean;
    is_default: boolean;
    permissions: string[];
    created_at: string;
    updated_at: string;
}

export interface RoleRef {
    id: string;
    name: string;
}

export interface AdminUser {
    id: string;
    username: string;
    created_at: string;
    role: RoleRef | null;
}
