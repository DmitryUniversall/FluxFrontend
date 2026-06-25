import { AnimatePresence, motion } from "framer-motion";
import { CircleArrowUp, Download, Gauge, LogOut, Settings, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@/main/common/platform";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { HelpMenu } from "@/main/features/guide/ui/HelpMenu";
import { RequestConsoleButton } from "@/main/features/console/ui/RequestConsoleButton";
import { AuthStoreButton } from "@/main/features/identities/ui/AuthStoreButton";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { EnvironmentSelector } from "@/main/features/environments/ui/EnvironmentSelector";
import { NotificationsBell } from "@/main/features/notifications/ui/NotificationsBell";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import { useAdminScreen } from "@/main/features/admin/ui/useAdminScreen";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { useReleases } from "@/main/features/releases/ui/useReleases";
import { useUpdateStatus } from "@/main/features/releases/ui/useUpdateStatus";
import { useAuth, useHasPermission } from "@/main/features/auth/ui/useAuth";

// Closes the other full-screen overlays so a freshly opened one returns to the
// request workspace when dismissed.
function closeOtherScreens() {
    useAuthStoreScreen.getState().setOpen(false);
    useSwaggerImport.getState().close();
    useSettingsScreen.getState().close();
    useAdminScreen.getState().close();
    useChangelog.getState().close();
    useReleases.getState().close();
}

export function TopBar() {
    const { user, logout } = useAuth();
    const isAdmin = useHasPermission("admin.access");
    const updateStatus = useUpdateStatus();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
            <div className="flex items-center gap-2" {...tourAnchor(ANCHORS.appLogo)}>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white shadow-sm shadow-accent/30">
                    <Zap size={15} fill="currentColor" />
                </div>
                <span className="text-[15px] font-bold tracking-tight">Flux</span>
            </div>

            <div className="flex items-center gap-2.5">
                <AuthStoreButton />
                <RequestConsoleButton />
                <div className="flex items-center" {...tourAnchor(ANCHORS.envSelector)}>
                    <EnvironmentSelector />
                </div>
                {isTauri() && updateStatus === "optional" && (
                    <button
                        onClick={() => {
                            closeOtherScreens();
                            useReleases.getState().showUpdates();
                        }}
                        title="Update available"
                        aria-label="Update available"
                        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-fg ring-accent"
                    >
                        <Download size={17} />
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
                    </button>
                )}
                <NotificationsBell />
                <HelpMenu />
                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-[13px] font-semibold text-fg ring-accent"
                        title={user?.username}
                        {...tourAnchor(ANCHORS.profileButton)}
                    >
                        {user?.username?.[0]?.toUpperCase() ?? "?"}
                    </button>
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.12 }}
                            >
                                <div className="px-2.5 py-2">
                                    <p className="text-[11px] uppercase tracking-wide text-subtle">Signed in as</p>
                                    <p className="truncate text-[13px] font-medium text-fg">{user?.username}</p>
                                </div>
                                <div className="my-1 h-px bg-border" />
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            closeOtherScreens();
                                            useAdminScreen.getState().show();
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-surface"
                                    >
                                        <Gauge size={14} /> Admin
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setOpen(false);
                                        // Settings takes over the body; close any other full-screen
                                        // so closing settings returns to the request workspace.
                                        closeOtherScreens();
                                        useSettingsScreen.getState().show();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-surface"
                                >
                                    <Settings size={14} /> Settings
                                </button>
                                {/* Downloads is a web-only concern (the desktop user already has the app). */}
                                {!isTauri() && (
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            closeOtherScreens();
                                            useReleases.getState().showDownloads();
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-surface"
                                    >
                                        <Download size={14} /> Downloads
                                    </button>
                                )}
                                {/* Updates only in the desktop build, and only when one is available. */}
                                {isTauri() && updateStatus !== "none" && (
                                    <button
                                        onClick={() => {
                                            setOpen(false);
                                            closeOtherScreens();
                                            useReleases.getState().showUpdates();
                                        }}
                                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-fg hover:bg-surface"
                                    >
                                        <CircleArrowUp size={14} /> Updates
                                        <span className="ml-auto h-2 w-2 rounded-full bg-accent" />
                                    </button>
                                )}
                                <div className="my-1 h-px bg-border" />
                                <button
                                    onClick={logout}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-red-400 hover:bg-red-500/10"
                                >
                                    <LogOut size={14} /> Sign out
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
