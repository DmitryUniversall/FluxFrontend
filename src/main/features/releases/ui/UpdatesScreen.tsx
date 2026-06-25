// Full-screen Updates (desktop only): a newer build is available - show the
// versions, point at What's new, and offer the download. Soft nudge, dismissible.
import { CircleArrowUp, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { APP_VERSION } from "@/main/common/version";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { AssetList, GithubLinks } from "./parts";
import { useReleases } from "./useReleases";

export function UpdatesScreen() {
    const { downloads, close, load } = useReleases();

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
                <CircleArrowUp size={16} className="text-accent" />
                <span className="text-sm font-semibold">Update available</span>
                <div className="flex-1" />
                <IconButton label="Close" onClick={close}>
                    <X size={16} />
                </IconButton>
            </div>

            <main className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-2xl space-y-7 px-8 py-8">
                    <section className="rounded-2xl border border-border bg-surface p-7 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                            <CircleArrowUp size={26} />
                        </div>
                        <h1 className="mt-4 text-lg font-semibold text-fg">A new version of Flux is available</h1>
                        <p className="mt-1.5 text-[13.5px] text-muted">
                            You're on <Version>{APP_VERSION}</Version>
                            {downloads.latest_app_version && (
                                <>
                                    {" - "}
                                    <Version>{downloads.latest_app_version}</Version> is out now.
                                </>
                            )}
                        </p>
                        <div className="mt-5 flex items-center justify-center gap-2.5">
                            <Button
                                variant="primary"
                                leftIcon={<Sparkles size={15} />}
                                onClick={() => {
                                    close();
                                    useChangelog.getState().show();
                                }}
                            >
                                See what's new
                            </Button>
                        </div>
                    </section>

                    {(downloads.assets.length > 0 ||
                        downloads.github_url !== "" ||
                        downloads.github_releases_url !== "") && (
                        <section className="space-y-4">
                            <h2 className="border-b border-border pb-2 text-[15px] font-semibold text-fg">
                                Get the update
                            </h2>
                            {downloads.assets.length > 0 && <AssetList assets={downloads.assets} />}
                            <GithubLinks config={downloads} />
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

function Version({ children }: { children: React.ReactNode }) {
    return <span className="font-mono text-[12.5px] text-fg">{children}</span>;
}
