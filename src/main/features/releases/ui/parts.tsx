// Shared bits for the Downloads / Updates screens: OS icons, the asset download
// links and the GitHub links.
import { Apple, Github, Monitor, Terminal, type LucideIcon } from "lucide-react";
import type { AssetOs, DownloadAsset, DownloadsConfig } from "../domain/models";

const OS_ICON: Record<AssetOs, LucideIcon> = {
    windows: Monitor,
    macos: Apple,
    linux: Terminal,
};

const OS_LABEL: Record<AssetOs, string> = {
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
};

// Best-effort guess of the visitor OS so we can highlight the matching build.
export function detectOs(): AssetOs | null {
    if (typeof navigator === "undefined") return null;
    const ua = `${navigator.userAgent} ${navigator.platform ?? ""}`.toLowerCase();
    if (ua.includes("win")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux") || ua.includes("x11")) return "linux";
    return null;
}

export function OsIcon({ os, size = 18 }: { os: AssetOs; size?: number }) {
    const Icon = OS_ICON[os];
    return <Icon size={size} />;
}

export function AssetCard({ asset, recommended }: { asset: DownloadAsset; recommended?: boolean }) {
    return (
        <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/60"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-fg">
                <OsIcon os={asset.os} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-medium text-fg">
                        {asset.label || OS_LABEL[asset.os]}
                    </span>
                    {recommended && (
                        <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            Your system
                        </span>
                    )}
                </span>
                {asset.kind && <span className="block truncate text-[11.5px] text-subtle">{asset.kind}</span>}
            </span>
            <span className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white shadow-sm shadow-accent/20 group-hover:brightness-110">
                Download
            </span>
        </a>
    );
}

// Asset list, with the visitor's OS first and tagged.
export function AssetList({ assets }: { assets: DownloadAsset[] }) {
    const mine = detectOs();
    const ordered = [...assets].sort((a, b) => Number(b.os === mine) - Number(a.os === mine));
    return (
        <div className="space-y-2.5">
            {ordered.map((asset) => (
                <AssetCard key={asset.id} asset={asset} recommended={asset.os === mine} />
            ))}
        </div>
    );
}

export function GithubLinks({ config }: { config: DownloadsConfig }) {
    if (!config.github_url && !config.github_releases_url) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {config.github_url && <GhLink href={config.github_url} label="View on GitHub" />}
            {config.github_releases_url && <GhLink href={config.github_releases_url} label="All releases" />}
        </div>
    );
}

function GhLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-[12.5px] font-medium text-fg transition-colors hover:border-subtle"
        >
            <Github size={14} /> {label}
        </a>
    );
}
