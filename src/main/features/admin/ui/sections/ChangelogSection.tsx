// Admin -> Changelog: edit this server's local release notes. Two panes - a list
// of releases (create / reorder / publish state) and a block editor with a live
// preview. Releases can also be imported from JSON. Publishing is a separate
// action so drafts stay private until ready.
import { useEffect, useState } from "react";
import { ApiError } from "@/core/http/http-client";
import {
    BlockEditor,
    fromEditableBlocks,
    normalizeBlocks,
    toEditableBlocks,
    type EditableBlock,
} from "@/main/common/ui/BlockEditor";
import { AlertTriangle, ChevronDown, ChevronUp, Eye, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Button, IconButton } from "@/main/common/ui/Button";
import { ContentBlocks } from "@/main/common/ui/ContentBlocks";
import { Input, Textarea } from "@/main/common/ui/Field";
import { Modal } from "@/main/common/ui/Modal";
import { Switch } from "@/main/common/ui/Switch";
import { toast } from "@/main/common/ui/toast";
import { cn } from "@/main/common/utils/cn";
import { useHasPermission } from "@/main/features/auth/ui/useAuth";
import { DocDemo } from "@/main/features/guide/ui/DocsInteractive";
import { useChangelogAdmin } from "@/main/features/changelog/ui/useChangelogAdmin";
import type { Release } from "@/main/features/changelog/domain/models";

// Must match the backend's announcement delay (_ReleaseBroadcaster.DELAY_SECONDS).
const ANNOUNCE_DELAY_MS = 60_000;

interface ReleaseDraft {
    id: string | null;
    version: string;
    title: string;
    is_published: boolean;
    body: EditableBlock[];
}

function draftFrom(release: Release): ReleaseDraft {
    return {
        id: release.id,
        version: release.version,
        title: release.title,
        is_published: release.is_published,
        body: toEditableBlocks(release.body),
    };
}

const BLANK: ReleaseDraft = { id: null, version: "", title: "", is_published: false, body: [] };

export function ChangelogSection() {
    const { releases, loadAll, create, update, remove, setPublished, reorder } = useChangelogAdmin();
    const [draft, setDraft] = useState<ReleaseDraft | null>(null);
    const [busy, setBusy] = useState(false);
    const [importing, setImporting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // The grace window after publishing, before the announcement (notification +
    // optional banner) goes out. Lets the admin retract a misclick.
    const [pending, setPending] = useState<{ id: string; version: string; endsAt: number } | null>(null);
    const [remainingMs, setRemainingMs] = useState(0);
    // Setting the banner on publish writes admin settings, which needs settings.write.
    const canSetBanner = useHasPermission("settings.write");

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    // Tick the countdown; clear it once the announcement has gone out.
    useEffect(() => {
        if (!pending) return;
        const tick = () => {
            const left = pending.endsAt - Date.now();
            setRemainingMs(left);
            if (left <= 0) setPending(null);
        };
        tick();
        const timer = window.setInterval(tick, 500);
        return () => window.clearInterval(timer);
    }, [pending]);

    const moveRelease = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= releases.length) return;
        const ids = releases.map((r) => r.id);
        [ids[i], ids[j]] = [ids[j], ids[i]];
        void reorder(ids);
    };

    const save = async () => {
        if (!draft) return;
        setBusy(true);
        try {
            const body = fromEditableBlocks(draft.body);
            if (draft.id) {
                const updated = await update(draft.id, {
                    version: draft.version.trim(),
                    title: draft.title.trim(),
                    body,
                });
                setDraft(draftFrom(updated));
            } else {
                const created = await create({
                    version: draft.version.trim(),
                    title: draft.title.trim(),
                    body,
                    is_published: draft.is_published,
                });
                setDraft(draftFrom(created));
            }
            toast.success("Release saved");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't save release");
        } finally {
            setBusy(false);
        }
    };

    const unpublish = async (id: string) => {
        setBusy(true);
        try {
            await setPublished(id, false);
            if (draft?.id === id) setDraft({ ...draft, is_published: false });
            if (pending?.id === id) setPending(null);
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't unpublish");
        } finally {
            setBusy(false);
        }
    };

    // Publish, then count down to the announcement (notification + optional banner),
    // which the server sends after a grace period so a misclick can be retracted.
    const publish = async (bannerText: string | null) => {
        if (!draft?.id) return;
        setBusy(true);
        try {
            await setPublished(draft.id, true, bannerText);
            setDraft({ ...draft, is_published: true });
            setPending({ id: draft.id, version: draft.version, endsAt: Date.now() + ANNOUNCE_DELAY_MS });
            setPublishing(false);
            toast.success("Release published");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't publish");
        } finally {
            setBusy(false);
        }
    };

    const removeRelease = async () => {
        if (!draft?.id) return;
        setBusy(true);
        try {
            await remove(draft.id);
            if (pending?.id === draft.id) setPending(null);
            setDraft(null);
            toast.info("Release deleted");
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : "Couldn't delete release");
        } finally {
            setBusy(false);
        }
    };

    const importDraft = (parsed: ReleaseDraft) => {
        setDraft(parsed);
        setImporting(false);
        toast.success("Release loaded - review and save");
    };

    return (
        <div className="space-y-4">
            {pending && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-300">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span className="flex-1">
                        Announcing <span className="font-semibold">{pending.version}</span> in{" "}
                        <span className="font-mono font-semibold">{formatCountdown(remainingMs)}</span> - everyone will
                        be notified.
                    </span>
                    <Button size="sm" variant="subtle" disabled={busy} onClick={() => void unpublish(pending.id)}>
                        Cancel
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
                <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                            <FileText size={14} className="text-accent" /> Releases
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<Upload size={14} />}
                                onClick={() => setImporting(true)}
                            >
                                Import
                            </Button>
                            <Button
                                size="sm"
                                variant="subtle"
                                leftIcon={<Plus size={14} />}
                                onClick={() => setDraft({ ...BLANK })}
                            >
                                New
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-surface">
                        {releases.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12px] text-subtle">No releases yet.</p>
                        ) : (
                            releases.map((release, i) => (
                                <div
                                    key={release.id}
                                    className={cn(
                                        "flex items-center gap-1.5 border-b border-border px-2.5 py-2 last:border-0",
                                        draft?.id === release.id ? "bg-accent/10" : "hover:bg-elevated",
                                    )}
                                >
                                    <button
                                        onClick={() => setDraft(draftFrom(release))}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[12px] font-semibold text-accent">
                                                {release.version}
                                            </span>
                                            <span
                                                className={cn(
                                                    "rounded px-1 py-0.5 text-[9.5px] font-medium uppercase tracking-wide",
                                                    release.is_published
                                                        ? "bg-emerald-500/15 text-emerald-400"
                                                        : "bg-elevated text-subtle",
                                                )}
                                            >
                                                {release.is_published ? "Live" : "Draft"}
                                            </span>
                                        </div>
                                        <div className="truncate text-[12px] text-muted">
                                            {release.title || "Untitled"}
                                        </div>
                                    </button>
                                    <div className="flex shrink-0 flex-col">
                                        <IconButton
                                            label="Move up"
                                            onClick={() => moveRelease(i, -1)}
                                            className="h-5 w-5"
                                        >
                                            <ChevronUp size={13} />
                                        </IconButton>
                                        <IconButton
                                            label="Move down"
                                            onClick={() => moveRelease(i, 1)}
                                            className="h-5 w-5"
                                        >
                                            <ChevronDown size={13} />
                                        </IconButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {draft ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
                            <Input
                                value={draft.version}
                                onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                                placeholder="Version (e.g. 2.1.0)"
                            />
                            <Input
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                placeholder="Title"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="primary"
                                disabled={busy || !draft.version.trim()}
                                onClick={() => void save()}
                            >
                                {draft.id ? "Save" : "Create"}
                            </Button>
                            {draft.id &&
                                (draft.is_published ? (
                                    <Button
                                        variant="subtle"
                                        disabled={busy}
                                        onClick={() => {
                                            if (draft.id) void unpublish(draft.id);
                                        }}
                                    >
                                        Unpublish
                                    </Button>
                                ) : (
                                    <Button variant="subtle" disabled={busy} onClick={() => setPublishing(true)}>
                                        Publish
                                    </Button>
                                ))}
                            <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
                                Cancel
                            </Button>
                            <div className="flex-1" />
                            {draft.id && (
                                <Button
                                    variant="danger"
                                    disabled={busy}
                                    leftIcon={<Trash2 size={14} />}
                                    onClick={() => void removeRelease()}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>

                        <div>
                            <p className="mb-2 text-[12px] font-medium text-subtle">Content</p>
                            <BlockEditor blocks={draft.body} onChange={(body) => setDraft({ ...draft, body })} />
                        </div>

                        <div>
                            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-subtle">
                                <Eye size={13} /> Preview
                            </p>
                            <div className="rounded-xl border border-border bg-surface p-5">
                                {draft.body.length > 0 ? (
                                    <ContentBlocks
                                        blocks={fromEditableBlocks(draft.body)}
                                        renderDemo={(demo) => <DocDemo kind={demo} />}
                                    />
                                ) : (
                                    <p className="text-[13px] text-subtle">Add blocks to see a preview.</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-center text-[13px] text-subtle">
                        Select a release to edit, create a new one, or import from JSON.
                    </div>
                )}

                <ImportModal open={importing} onClose={() => setImporting(false)} onImport={importDraft} />
                <PublishModal
                    open={publishing}
                    version={draft?.version ?? ""}
                    canSetBanner={canSetBanner}
                    busy={busy}
                    onClose={() => setPublishing(false)}
                    onConfirm={publish}
                />
            </div>
        </div>
    );
}

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function PublishModal({
    open,
    version,
    canSetBanner,
    busy,
    onClose,
    onConfirm,
}: {
    open: boolean;
    version: string;
    canSetBanner: boolean;
    busy: boolean;
    onClose: () => void;
    onConfirm: (bannerText: string | null) => void;
}) {
    const [showBanner, setShowBanner] = useState(false);
    const [bannerText, setBannerText] = useState("");

    // Seed a default banner message (with the version) each time the modal opens.
    useEffect(() => {
        if (open) {
            setShowBanner(false);
            setBannerText(`Flux ${version} is out. See what's new.`);
        }
    }, [open, version]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Publish release"
            width={520}
            footer={
                <>
                    <Button variant="ghost" disabled={busy} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" disabled={busy} onClick={() => onConfirm(showBanner ? bannerText : null)}>
                        Publish
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-muted">
                    The release goes live now. The announcement - a notification to everyone
                    {canSetBanner ? ", and the banner below," : ""} is sent about a minute later, with a countdown so
                    you can cancel if this was a mistake.
                </p>
                {canSetBanner && (
                    <div className="rounded-lg border border-border bg-bg p-3">
                        <label className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-medium text-fg">Also show an announcement banner</span>
                            <Switch checked={showBanner} onChange={setShowBanner} label="Show announcement banner" />
                        </label>
                        {showBanner && (
                            <div className="mt-3">
                                <Textarea
                                    rows={2}
                                    value={bannerText}
                                    onChange={(e) => setBannerText(e.target.value)}
                                    placeholder="Banner text shown across the top of the app"
                                />
                                <p className="mt-1.5 text-[11.5px] text-subtle">
                                    Appears for everyone when the announcement is sent, and stays until you turn it off
                                    in Settings.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Parses a release from pasted/uploaded JSON. Accepts a single release object or
// an array (first item), and tolerates partial/dirty data via normalizeBlocks.
function parseReleaseJson(text: string): ReleaseDraft {
    const data: unknown = JSON.parse(text);
    const obj = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!obj || typeof obj !== "object") throw new Error("Expected a release object");
    return {
        id: null,
        version: String(obj.version ?? "").trim(),
        title: String(obj.title ?? "").trim(),
        is_published: Boolean(obj.is_published),
        body: toEditableBlocks(normalizeBlocks(obj.body)),
    };
}

function ImportModal({
    open,
    onClose,
    onImport,
}: {
    open: boolean;
    onClose: () => void;
    onImport: (draft: ReleaseDraft) => void;
}) {
    const [text, setText] = useState("");

    const apply = () => {
        try {
            const draft = parseReleaseJson(text);
            if (!draft.version) {
                toast.error("JSON is missing a version");
                return;
            }
            onImport(draft);
            setText("");
        } catch {
            toast.error("Invalid JSON");
        }
    };

    const onFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setText(String(reader.result ?? ""));
        reader.readAsText(file);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Import release from JSON"
            width={560}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" disabled={!text.trim()} onClick={apply}>
                        Load
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                <p className="text-[12.5px] text-muted">
                    Paste a release object (<code className="mono text-[11.5px]">version</code>,{" "}
                    <code className="mono text-[11.5px]">title</code>, <code className="mono text-[11.5px]">body</code>)
                    or upload a <code className="mono text-[11.5px]">.json</code> file. It loads into the editor for
                    review before saving.
                </p>
                <Textarea
                    rows={10}
                    className="mono text-[12px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='{ "version": "2.1.0", "title": "…", "body": [ { "kind": "paragraph", "text": "…" } ] }'
                />
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-accent hover:underline">
                    <Upload size={14} />
                    Upload .json
                    <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onFile(file);
                        }}
                    />
                </label>
            </div>
        </Modal>
    );
}
