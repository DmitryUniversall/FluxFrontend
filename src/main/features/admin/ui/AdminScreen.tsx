// Full-screen Admin dashboard (mirrors the Settings/Docs screen layout). Sections:
// Overview (system + metrics), Settings (runtime switches + config), Roles, Users.
import {
    Download,
    FileText,
    Gauge,
    LayoutDashboard,
    RefreshCw,
    Shield,
    SlidersHorizontal,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { cn } from "@/main/common/utils/cn";
import { useAuth } from "@/main/features/auth/ui/useAuth";
import { ChangelogSection } from "./sections/ChangelogSection";
import { DownloadsSection } from "./sections/DownloadsSection";
import { OverviewSection } from "./sections/OverviewSection";
import { RolesSection } from "./sections/RolesSection";
import { SettingsSection } from "./sections/SettingsSection";
import { UsersSection } from "./sections/UsersSection";
import { useAdminScreen, type AdminSection } from "./useAdminScreen";

// Each section needs a permission; users only see what they can actually open
// (the backend guards every route too).
const NAV: { id: AdminSection; label: string; icon: LucideIcon; permission: string }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, permission: "metrics.read" },
    { id: "settings", label: "Settings", icon: SlidersHorizontal, permission: "settings.read" },
    { id: "roles", label: "Roles", icon: Shield, permission: "roles.manage" },
    { id: "users", label: "Users", icon: Users, permission: "users.read" },
    { id: "changelog", label: "Changelog", icon: FileText, permission: "changelog.write" },
    { id: "downloads", label: "Downloads", icon: Download, permission: "settings.read" },
];

export function AdminScreen() {
    const { section, setSection, close, loadOverview, overview, timeseries, loading, error } = useAdminScreen();
    const myPermissions = useAuth((s) => s.user?.permissions ?? []);
    const nav = useMemo(() => NAV.filter((item) => myPermissions.includes(item.permission)), [myPermissions]);

    // Keep the active section valid when the visible set is narrower than the
    // default (e.g. an editor who can see Overview but not Settings).
    useEffect(() => {
        if (nav.length && !nav.some((item) => item.id === section)) setSection(nav[0].id);
    }, [nav, section, setSection]);

    // Overview auto-refreshes while it is the active (and permitted) section; the
    // other sections load their own data once on mount (see each section component).
    const canSeeOverview = nav.some((item) => item.id === "overview");
    useEffect(() => {
        if (section !== "overview" || !canSeeOverview) return;
        void loadOverview();
        const timer = window.setInterval(() => void loadOverview(), 5000);
        return () => window.clearInterval(timer);
    }, [section, canSeeOverview, loadOverview]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <Gauge size={16} className="text-accent" />
                <span className="text-sm font-semibold">Admin</span>
                <div className="flex-1" />
                {section === "overview" && (
                    <IconButton label="Refresh" onClick={() => void loadOverview()}>
                        <RefreshCw size={15} className={cn(loading && "animate-spin")} />
                    </IconButton>
                )}
                <IconButton label="Close" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
                    {nav.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSection(item.id)}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                                section === item.id
                                    ? "bg-accent/15 font-medium text-fg"
                                    : "text-muted hover:bg-elevated hover:text-fg",
                            )}
                        >
                            <item.icon size={15} />
                            {item.label}
                        </button>
                    ))}
                </aside>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl px-8 py-7">
                        {error && (
                            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                                {error}
                            </div>
                        )}
                        {nav.length === 0 && (
                            <p className="text-[13px] text-muted">You don't have access to any admin sections.</p>
                        )}
                        {section === "overview" &&
                            (overview ? (
                                <OverviewSection overview={overview} requests={timeseries.map((p) => p.requests)} />
                            ) : (
                                loading && <p className="text-[13px] text-muted">Loading…</p>
                            ))}
                        {section === "settings" && <SettingsSection />}
                        {section === "roles" && <RolesSection />}
                        {section === "users" && <UsersSection />}
                        {section === "changelog" && <ChangelogSection />}
                        {section === "downloads" && <DownloadsSection />}
                    </div>
                </main>
            </div>
        </div>
    );
}
