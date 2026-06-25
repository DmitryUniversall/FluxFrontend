// Full-screen "What's new": two channels - the official Flux releases (upstream)
// and this server's own release notes - on separate tabs so a long local history
// never buries the official feed. Renders release bodies with the shared
// content-block renderer (same as the docs). Mirrors the Docs/Admin layout.
import { AlertTriangle, Globe, RefreshCw, Server, Sparkles, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { ContentBlocks } from "@/main/common/ui/ContentBlocks";
import { EmptyState } from "@/main/common/ui/feedback";
import { cn } from "@/main/common/utils/cn";
import { DocDemo } from "@/main/features/guide/ui/DocsInteractive";
import type { Release } from "../domain/models";
import { useChangelog } from "./useChangelog";
import { useWhatsNew } from "./useWhatsNew";

type Tab = "official" | "local";

export function ChangelogScreen() {
    const { local, upstream, loadingLocal, loadingUpstream, close, load } = useChangelog();
    const [tab, setTab] = useState<Tab>("official");

    useEffect(() => {
        void load();
    }, [load]);

    // Viewing the changelog clears the "what's new" badge: mark the newest version
    // on each channel as seen as soon as it loads.
    useEffect(() => {
        const officialLatest =
            upstream && upstream.available && upstream.releases.length > 0 ? upstream.releases[0].version : null;
        useWhatsNew.getState().markSeen({ local: local[0]?.version ?? null, official: officialLatest });
    }, [local, upstream]);

    // The official tab only exists when this instance proxies upstream; otherwise
    // there is just the one channel and no tab strip.
    const officialAvailable = upstream?.available !== false;
    const activeTab: Tab = officialAvailable ? tab : "local";

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <Sparkles size={16} className="text-accent" />
                <span className="text-sm font-semibold">What's new</span>
                <div className="flex-1" />
                <IconButton label="Refresh" onClick={() => void load()}>
                    <RefreshCw size={15} className={cn((loadingLocal || loadingUpstream) && "animate-spin")} />
                </IconButton>
                <IconButton label="Close" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            {officialAvailable && (
                <div className="flex shrink-0 items-center gap-1 border-b border-border px-4">
                    <TabButton
                        icon={Globe}
                        label="Flux releases"
                        active={activeTab === "official"}
                        onClick={() => setTab("official")}
                    />
                    <TabButton
                        icon={Server}
                        label="This server"
                        active={activeTab === "local"}
                        onClick={() => setTab("local")}
                    />
                </div>
            )}

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-8 py-7">
                    {activeTab === "official" ? (
                        loadingUpstream && !upstream ? (
                            <Loading />
                        ) : upstream && upstream.releases.length > 0 ? (
                            <div className="space-y-6">
                                {upstream.stale && <StaleNote />}
                                {upstream.releases.map((r) => (
                                    <ReleaseArticle key={r.id} release={r} />
                                ))}
                            </div>
                        ) : (
                            <Notice
                                text={
                                    upstream?.stale
                                        ? "Couldn't load the official changelog. Check back later."
                                        : "No official releases yet."
                                }
                            />
                        )
                    ) : loadingLocal && local.length === 0 ? (
                        <Loading />
                    ) : local.length > 0 ? (
                        <div className="space-y-6">
                            {local.map((r) => (
                                <ReleaseArticle key={r.id} release={r} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Server size={22} />}
                            title="No release notes"
                            hint="This server hasn't published any release notes yet."
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

function TabButton({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}

function ReleaseArticle({ release }: { release: Release }) {
    const date = release.published_at ?? release.created_at;
    return (
        <article className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[12px] font-semibold text-accent">
                    {release.version}
                </span>
                <h3 className="text-[15px] font-semibold text-fg">{release.title}</h3>
                <span className="ml-auto text-[12px] text-subtle">
                    {new Date(date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })}
                </span>
            </div>
            <ContentBlocks blocks={release.body} renderDemo={(demo) => <DocDemo kind={demo} />} />
        </article>
    );
}

function Loading() {
    return <p className="text-[13px] text-muted">Loading…</p>;
}

function StaleNote() {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-300">
            <AlertTriangle size={14} className="shrink-0" />
            Showing a cached copy - the latest couldn't be fetched.
        </div>
    );
}

function Notice({ text }: { text: string }) {
    return <div className="rounded-lg border border-border bg-surface px-3.5 py-3 text-[13px] text-subtle">{text}</div>;
}
