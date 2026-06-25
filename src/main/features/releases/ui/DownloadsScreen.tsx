// Full-screen Downloads: a pitch for the desktop app + per-OS download links and
// GitHub links (served by the backend). Shown in the web build.
import { Download, Globe, Plug, ShieldCheck, X, Zap, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { IconButton } from "@/main/common/ui/Button";
import { EmptyState } from "@/main/common/ui/feedback";
import { AssetList, GithubLinks } from "./parts";
import { useReleases } from "./useReleases";

const REASONS: { icon: LucideIcon; title: string; text: string }[] = [
    {
        icon: Zap,
        title: "Native HTTP requests",
        text: "Requests go out from your machine, not a browser - no CORS limits and no proxy in the middle.",
    },
    {
        icon: Plug,
        title: "Reach any server",
        text: "Hit localhost, Docker and private networks the browser can't reach from a hosted page.",
    },
    {
        icon: ShieldCheck,
        title: "Your data stays yours",
        text: "Point the app at any Flux backend you run; nothing has to pass through a third party.",
    },
    {
        icon: Globe,
        title: "Always at hand",
        text: "Lives in your dock or taskbar, opens instantly and keeps working when you're offline.",
    },
];

export function DownloadsScreen() {
    const { downloads, close, load } = useReleases();

    useEffect(() => {
        void load();
    }, [load]);

    const hasAnything =
        downloads.assets.length > 0 || downloads.github_url !== "" || downloads.github_releases_url !== "";

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <Download size={16} className="text-accent" />
                <span className="text-sm font-semibold">Download Flux</span>
                <div className="flex-1" />
                <IconButton label="Close" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-10 px-8 py-8">
                    {/* Pitch */}
                    <section className="rounded-2xl border border-border bg-surface p-7">
                        <h1 className="text-xl font-bold tracking-tight text-fg">Do more with the Flux desktop app</h1>
                        <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-muted">
                            The web app is great for a quick look. The desktop app removes the browser's limits and
                            makes Flux a first-class tool for everyday API work.
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                            {REASONS.map((r) => (
                                <div key={r.title} className="flex gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                                        <r.icon size={17} />
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-[13.5px] font-semibold text-fg">{r.title}</div>
                                        <div className="mt-0.5 text-[12.5px] leading-snug text-subtle">{r.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Downloads */}
                    {hasAnything ? (
                        <section className="space-y-4">
                            <div className="flex items-baseline gap-2 border-b border-border pb-2">
                                <h2 className="text-[15px] font-semibold text-fg">Get the desktop app</h2>
                                {downloads.latest_app_version && (
                                    <span className="text-[12px] text-subtle">v{downloads.latest_app_version}</span>
                                )}
                            </div>
                            {downloads.assets.length > 0 ? (
                                <AssetList assets={downloads.assets} />
                            ) : (
                                <p className="text-[13px] text-subtle">
                                    Builds are published on GitHub - see the links below.
                                </p>
                            )}
                            <GithubLinks config={downloads} />
                        </section>
                    ) : (
                        <EmptyState
                            icon={<Download size={22} />}
                            title="Downloads not set up yet"
                            hint="This server hasn't published any download links. Check back later."
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
