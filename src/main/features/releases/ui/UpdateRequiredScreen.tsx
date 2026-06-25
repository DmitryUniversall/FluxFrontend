// Hard gate (desktop): the running build is below the server's minimum supported
// version and can no longer talk to it. The app is unusable until updated, so
// this replaces the whole shell and is not dismissible.
import { AlertTriangle, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/main/common/ui/Button";
import { APP_VERSION } from "@/main/common/version";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { AssetList, GithubLinks } from "./parts";
import { useReleases } from "./useReleases";

export function UpdateRequiredScreen() {
    const downloads = useReleases((s) => s.downloads);
    const minVersion = useInstanceMeta((s) => s.meta?.min_app_version);

    useEffect(() => {
        void useReleases.getState().load();
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
            <div className="w-full max-w-lg space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                    <AlertTriangle size={26} />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-fg">Update required</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                        This version of Flux ({APP_VERSION}) is no longer compatible with this server
                        {minVersion ? ` (it needs ${minVersion} or newer)` : ""}. Please update to keep working.
                    </p>
                </div>

                {downloads.assets.length > 0 && (
                    <div className="text-left">
                        <AssetList assets={downloads.assets} />
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <GithubLinks config={downloads} />
                    <Button
                        variant="subtle"
                        leftIcon={<Sparkles size={15} />}
                        onClick={() => useChangelog.getState().show()}
                    >
                        What's new
                    </Button>
                </div>
            </div>
        </div>
    );
}
