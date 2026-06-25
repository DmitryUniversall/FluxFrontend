// Downloads editor: the per-OS desktop build links, the GitHub links and the two
// version thresholds the desktop update check keys off (latest = soft nudge,
// minimum = hard block). Saved via PUT /admin/downloads.
import { Download, Github, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/main/common/ui/Button";
import { Input, Select } from "@/main/common/ui/Field";
import { toast } from "@/main/common/ui/toast";
import type { AssetOs, DownloadAsset, DownloadsConfig } from "@/main/features/releases/domain/models";
import { SectionTitle } from "../parts";
import { useAdminScreen } from "../useAdminScreen";

const DEFAULT_DRAFT: DownloadsConfig = {
    latest_app_version: "",
    min_app_version: "",
    github_url: "",
    github_releases_url: "",
    assets: [],
};

const OS_OPTIONS: AssetOs[] = ["windows", "macos", "linux"];

function newId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function DownloadsSection() {
    const { downloads, loadDownloads, saveDownloads } = useAdminScreen();
    const [draft, setDraft] = useState<DownloadsConfig>(downloads ?? DEFAULT_DRAFT);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void loadDownloads();
    }, [loadDownloads]);

    // Re-seed the form whenever fresh config arrives from the server.
    useEffect(() => {
        if (downloads) setDraft(downloads);
    }, [downloads]);

    const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(downloads), [draft, downloads]);

    const patch = (next: Partial<DownloadsConfig>) => setDraft((d) => ({ ...d, ...next }));
    const patchAsset = (id: string, next: Partial<DownloadAsset>) =>
        setDraft((d) => ({ ...d, assets: d.assets.map((a) => (a.id === id ? { ...a, ...next } : a)) }));
    const addAsset = () =>
        setDraft((d) => ({
            ...d,
            assets: [...d.assets, { id: newId(), os: "windows", label: "", url: "", kind: "" }],
        }));
    const removeAsset = (id: string) => setDraft((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== id) }));

    const save = async () => {
        setSaving(true);
        try {
            await saveDownloads(draft);
            toast.success("Downloads saved");
        } catch {
            toast.error("Couldn't save downloads");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-7">
            <section>
                <SectionTitle icon={Download} title="Version check" />
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <Field
                        title="Latest app version"
                        description="Newest desktop build available. Older desktop clients get a soft update nudge."
                        control={
                            <Input
                                className="w-40"
                                value={draft.latest_app_version}
                                onChange={(e) => patch({ latest_app_version: e.target.value })}
                                placeholder="1.2.0"
                            />
                        }
                    />
                    <Field
                        title="Minimum app version"
                        description="Oldest desktop build still allowed. Clients below this are hard-blocked until they update."
                        control={
                            <Input
                                className="w-40"
                                value={draft.min_app_version}
                                onChange={(e) => patch({ min_app_version: e.target.value })}
                                placeholder="1.0.0"
                            />
                        }
                    />
                </div>
                <p className="mt-2 text-[12px] text-subtle">Leave both blank to disable the desktop update check.</p>
            </section>

            <section>
                <SectionTitle icon={Github} title="Links" />
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <Field
                        title="GitHub repository"
                        description="Shown on the Downloads screen."
                        control={
                            <Input
                                className="w-72"
                                value={draft.github_url}
                                onChange={(e) => patch({ github_url: e.target.value })}
                                placeholder="https://github.com/you/flux"
                            />
                        }
                    />
                    <Field
                        title="Releases page"
                        description="Link to all published releases."
                        control={
                            <Input
                                className="w-72"
                                value={draft.github_releases_url}
                                onChange={(e) => patch({ github_releases_url: e.target.value })}
                                placeholder="https://github.com/you/flux/releases"
                            />
                        }
                    />
                </div>
            </section>

            <section>
                <SectionTitle icon={Download} title="Download links" />
                <div className="space-y-2.5">
                    {draft.assets.map((asset) => (
                        <div
                            key={asset.id}
                            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                        >
                            <Select
                                className="w-32"
                                value={asset.os}
                                onChange={(e) => patchAsset(asset.id, { os: e.target.value as AssetOs })}
                            >
                                {OS_OPTIONS.map((os) => (
                                    <option key={os} value={os}>
                                        {os}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                className="w-40"
                                value={asset.label}
                                onChange={(e) => patchAsset(asset.id, { label: e.target.value })}
                                placeholder="Windows (x64)"
                            />
                            <Input
                                className="w-28"
                                value={asset.kind}
                                onChange={(e) => patchAsset(asset.id, { kind: e.target.value })}
                                placeholder="Installer"
                            />
                            <Input
                                className="min-w-0 flex-1"
                                value={asset.url}
                                onChange={(e) => patchAsset(asset.id, { url: e.target.value })}
                                placeholder="https://.../Flux_1.2.0_x64.exe"
                            />
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => removeAsset(asset.id)}
                                aria-label="Remove download"
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ))}
                    <Button variant="subtle" size="sm" leftIcon={<Plus size={14} />} onClick={addAsset}>
                        Add download
                    </Button>
                </div>
            </section>

            <div className="flex items-center gap-2">
                <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save changes"}
                </Button>
                {dirty && (
                    <Button variant="ghost" disabled={saving} onClick={() => downloads && setDraft(downloads)}>
                        Reset
                    </Button>
                )}
            </div>
        </div>
    );
}

function Field({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-fg">{title}</div>
                <div className="mt-0.5 text-[12px] leading-snug text-subtle">{description}</div>
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}
