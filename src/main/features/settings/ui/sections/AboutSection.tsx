// About: version info for this Flux instance (frontend version from package.json,
// backend version from /meta) plus a shortcut into the changelog.
import { useEffect } from "react";
import { Button } from "@/main/common/ui/Button";
import { APP_VERSION } from "@/main/common/version";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { useChangelog } from "@/main/features/changelog/ui/useChangelog";
import { SettingRow, SettingsGroup, SettingsPage } from "../parts";

function Version({ children }: { children: React.ReactNode }) {
    return <span className="font-mono text-[12.5px] text-fg">{children}</span>;
}

export function AboutSection() {
    const backendVersion = useInstanceMeta((s) => s.meta?.version);

    useEffect(() => {
        if (!backendVersion) void useInstanceMeta.getState().load();
    }, [backendVersion]);

    return (
        <SettingsPage title="About" description="Version information for this Flux instance.">
            <SettingsGroup title="Flux">
                <SettingRow title="App version" control={<Version>{APP_VERSION}</Version>} />
                <SettingRow title="Server version" control={<Version>{backendVersion ?? "…"}</Version>} />
            </SettingsGroup>
            <SettingsGroup>
                <SettingRow
                    title="What's new"
                    description="Release notes for Flux and for this server."
                    control={
                        <Button size="sm" variant="subtle" onClick={() => useChangelog.getState().show()}>
                            Open
                        </Button>
                    }
                />
            </SettingsGroup>
        </SettingsPage>
    );
}
