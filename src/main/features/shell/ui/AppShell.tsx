import { ChevronsDown, ChevronsUp, MousePointerClick } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { EmptyState } from "@/main/common/ui/feedback";
import { useLayout } from "@/main/common/ui/useLayout";
import { Sidebar } from "@/main/features/collections/ui/Sidebar";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { EnvPanel } from "@/main/features/environments/ui/EnvPanel";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { RequestConsolePanel } from "@/main/features/console/ui/RequestConsolePanel";
import { AuthStoreScreen } from "@/main/features/identities/ui/AuthStoreScreen";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { useIdentities } from "@/main/features/identities/ui/useIdentities";
import { useNotifications } from "@/main/features/notifications/ui/useNotifications";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { DocsScreen } from "@/main/features/guide/ui/DocsScreen";
import { OnboardingOffer } from "@/main/features/guide/ui/OnboardingOffer";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { FlowEditor } from "@/main/features/flow/ui/FlowEditor";
import { FlowRunPanel } from "@/main/features/flow/ui/FlowRunPanel";
import { useFlowEditor } from "@/main/features/flow/ui/useFlowEditor";
import { clearEditorCaches } from "@/main/features/request-editor/ui/editor-cache";
import { RequestEditor } from "@/main/features/request-editor/ui/RequestEditor";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { ResponsePanel } from "@/main/features/response-viewer/ui/ResponsePanel";
import { SwaggerImportScreen } from "@/main/features/swagger-import/ui/SwaggerImportScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import { SettingsScreen } from "@/main/features/settings/ui/SettingsScreen";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { AdminScreen } from "@/main/features/admin/ui/AdminScreen";
import { useAdminScreen } from "@/main/features/admin/ui/useAdminScreen";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { ChangelogScreen } from "@/main/features/changelog/ui/ChangelogScreen";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { useWhatsNew } from "@/main/features/changelog/ui/useWhatsNew";
import { DownloadsScreen } from "@/main/features/releases/ui/DownloadsScreen";
import { UpdatesScreen } from "@/main/features/releases/ui/UpdatesScreen";
import { UpdateRequiredScreen } from "@/main/features/releases/ui/UpdateRequiredScreen";
import { useReleases } from "@/main/features/releases/ui/useReleases";
import { useUpdateStatus } from "@/main/features/releases/ui/useUpdateStatus";
import { useHasPermission } from "@/main/features/auth/ui/useAuth";
import { InstanceBanner } from "./InstanceBanner";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { TopBar } from "./TopBar";
import { useLiveUpdates } from "./useLiveUpdates";

export function AppShell() {
    const selectedRequestId = useCollections((s) => s.selectedRequestId);
    const tree = useCollections((s) => s.tree);
    const workspaces = useWorkspaces((s) => s.workspaces);
    const activeWorkspaceId = useWorkspaces((s) => s.activeId);
    const authStoreOpen = useAuthStoreScreen((s) => s.open);
    const swaggerOpen = useSwaggerImport((s) => s.open);
    const settingsOpen = useSettingsScreen((s) => s.open);
    const adminOpen = useAdminScreen((s) => s.open);
    const changelogOpen = useChangelog((s) => s.open);
    const releasesScreen = useReleases((s) => s.screen);
    const updateStatus = useUpdateStatus();
    const maintenanceMode = useInstanceMeta((s) => s.meta?.maintenance_mode ?? false);
    const isAdmin = useHasPermission("admin.access");
    const docsOpen = useHelp((s) => s.docsOpen);
    const loadRequest = useRequestEditor((s) => s.load);
    const loadFlow = useFlowEditor((s) => s.load);
    const { topFrac, setTopFrac, responseCollapsed, toggleResponse } = useLayout();
    const mainRef = useRef<HTMLDivElement>(null);

    const selectedKind = useMemo(() => {
        for (const c of tree) for (const r of c.requests) if (r.id === selectedRequestId) return r.kind;
        return null;
    }, [tree, selectedRequestId]);
    const isFlow = selectedKind === "flow";

    // initial data: workspaces must resolve first so the active workspace is set
    // before collections/environments (which are scoped to it) load.
    useEffect(() => {
        void useWorkspaces.getState().load();
        void useNotifications.getState().load();
        // Download links + the version-check thresholds (drives the update gate).
        void useReleases.getState().load();
    }, []);

    // Instance meta drives the announcement banner + maintenance gate. It changes
    // rarely, so a slow poll keeps every client in sync without a live channel.
    useEffect(() => {
        void useInstanceMeta.getState().load();
        const timer = window.setInterval(() => void useInstanceMeta.getState().load(), 60000);
        return () => window.clearInterval(timer);
    }, []);

    // Compute the "what's new" badge once on load (cheap; upstream is server-cached).
    useEffect(() => {
        void useWhatsNew.getState().check();
    }, []);

    // Reflect the active workspace in the document/tab title ("Flux - <name>").
    useEffect(() => {
        const ws = workspaces.find((w) => w.id === activeWorkspaceId);
        document.title = ws ? `Flux - ${ws.name}` : "Flux";
    }, [workspaces, activeWorkspaceId]);

    // (re)load workspace-scoped data whenever the active workspace changes.
    useEffect(() => {
        if (!activeWorkspaceId) return;
        clearEditorCaches(); // snapshots belong to the previous workspace
        useCollections.getState().select(null);
        void useCollections.getState().load();
        void useEnvironments.getState().load();
        void useIdentities.getState().load();
    }, [activeWorkspaceId]);

    // load the selected node into the matching editor
    useEffect(() => {
        if (!selectedRequestId) return;
        if (selectedKind === "flow") void loadFlow(selectedRequestId);
        else void loadRequest(selectedRequestId);
    }, [selectedRequestId, selectedKind, loadRequest, loadFlow]);

    // Collaboration sync via a single long-poll connection (replaces short
    // polling): the server pushes a response only when something changes.
    useLiveUpdates();

    // draggable horizontal splitter between request and response
    const startDrag = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            const move = (ev: PointerEvent) => {
                const box = mainRef.current?.getBoundingClientRect();
                if (!box) return;
                const frac = (ev.clientY - box.top) / box.height;
                setTopFrac(Math.min(0.85, Math.max(0.2, frac)));
            };
            const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
        },
        [setTopFrac],
    );

    const bottomLabel = isFlow ? "Run results" : "Response";

    // Maintenance mode locks everyone out except admins (who keep access so they
    // can turn it back off). Admins still see the maintenance notice in the banner.
    if (maintenanceMode && !isAdmin) {
        return <MaintenanceScreen />;
    }

    // Desktop hard gate: a build below the server's minimum can't work here. The
    // app is locked, but the user can still open the release notes (and close
    // them back to the gate) - nothing else is reachable.
    if (updateStatus === "required") {
        return changelogOpen ? (
            <div className="flex h-screen flex-col bg-bg">
                <ChangelogScreen />
            </div>
        ) : (
            <UpdateRequiredScreen />
        );
    }

    if (adminOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <AdminScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (changelogOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <ChangelogScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (docsOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <DocsScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (settingsOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <SettingsScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (swaggerOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <SwaggerImportScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (authStoreOpen) {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <AuthStoreScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    // Releases overlays are last so any other screen opened on top of them wins.
    if (releasesScreen === "downloads") {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <DownloadsScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    if (releasesScreen === "updates") {
        return (
            <div className="flex h-screen flex-col bg-bg">
                <TopBar />
                <InstanceBanner />
                <UpdatesScreen />
                <RequestConsolePanel />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-bg">
            <TopBar />
            <InstanceBanner />
            <div className="flex min-h-0 flex-1">
                <Sidebar />
                <EnvPanel />
                <main ref={mainRef} className="flex min-w-0 flex-1 flex-col">
                    {selectedRequestId ? (
                        responseCollapsed ? (
                            <>
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    {isFlow ? <FlowEditor /> : <RequestEditor />}
                                </div>
                                <button
                                    onClick={toggleResponse}
                                    className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-4 py-1.5 text-left text-[12px] text-subtle hover:text-fg"
                                >
                                    <ChevronsUp size={14} />
                                    <span className="font-medium uppercase tracking-wide">{bottomLabel}</span>
                                    <span className="text-subtle">- collapsed</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <div
                                    style={{ height: `calc(${topFrac * 100}% - 3px)` }}
                                    className="min-h-0 overflow-hidden"
                                >
                                    {isFlow ? <FlowEditor /> : <RequestEditor />}
                                </div>
                                <div className="group relative flex h-1.5 shrink-0 items-center justify-center bg-border transition-colors hover:bg-accent/50">
                                    <div onPointerDown={startDrag} className="absolute inset-0 cursor-row-resize" />
                                    <div className="pointer-events-none h-0.5 w-8 rounded-full bg-subtle/60 group-hover:bg-accent" />
                                    <IconButton
                                        label={`Collapse ${bottomLabel.toLowerCase()}`}
                                        onClick={toggleResponse}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="absolute right-1 h-5 w-5"
                                    >
                                        <ChevronsDown size={13} />
                                    </IconButton>
                                </div>
                                <div
                                    style={{ height: `calc(${(1 - topFrac) * 100}% - 3px)` }}
                                    className="min-h-0 overflow-hidden"
                                >
                                    {isFlow ? <FlowRunPanel /> : <ResponsePanel />}
                                </div>
                            </>
                        )
                    ) : (
                        <EmptyState
                            icon={<MousePointerClick size={26} />}
                            title="Select a request"
                            hint="Pick a request from the sidebar, or create a collection and add one to get started."
                        />
                    )}
                </main>
            </div>
            <RequestConsolePanel />
            <OnboardingOffer />
        </div>
    );
}
