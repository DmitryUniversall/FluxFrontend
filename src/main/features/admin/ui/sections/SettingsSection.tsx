// Settings: runtime switches (registration, maintenance, banner) + a read-only
// view of the (non-sensitive) effective config. The banner supports dismissible
// vs sticky and an optional active window (quick durations or full scheduling).
import { CalendarClock, Megaphone, ServerCog, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/main/common/ui/Button";
import { Input, Select, Textarea } from "@/main/common/ui/Field";
import { Switch } from "@/main/common/ui/Switch";
import { toast } from "@/main/common/ui/toast";
import type { AdminSettings, Announcement, AnnouncementLevel, EffectiveConfig } from "../../domain/models";
import { SectionTitle } from "../parts";
import { useAdminScreen } from "../useAdminScreen";

const DEFAULT_DRAFT: AdminSettings = {
    registration_enabled: true,
    maintenance_mode: false,
    maintenance_message: "",
    announcement: null,
};

const BLANK_ANNOUNCEMENT: Announcement = {
    text: "",
    level: "info",
    enabled: false,
    dismissible: true,
    starts_at: null,
    ends_at: null,
};

const QUICK_DURATIONS: [string, number][] = [
    ["30 min", 30 * 60_000],
    ["1 hour", 60 * 60_000],
    ["3 hours", 3 * 60 * 60_000],
    ["1 day", 24 * 60 * 60_000],
    ["1 week", 7 * 24 * 60 * 60_000],
];

export function SettingsSection() {
    const { settings, config, loadSettings, saveSettings } = useAdminScreen();
    const [draft, setDraft] = useState<AdminSettings>(settings ?? DEFAULT_DRAFT);
    const [saving, setSaving] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    // Re-seed the form whenever fresh settings arrive from the server.
    useEffect(() => {
        if (settings) setDraft(settings);
    }, [settings]);

    const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
    const announcement = draft.announcement;
    const announcementOn = announcement?.enabled ?? false;

    const patch = (next: Partial<AdminSettings>) => setDraft((d) => ({ ...d, ...next }));
    const patchAnnouncement = (next: Partial<Announcement>) =>
        setDraft((d) => ({ ...d, announcement: { ...BLANK_ANNOUNCEMENT, ...d.announcement, ...next } }));

    const showFor = (ms: number) =>
        patchAnnouncement({ starts_at: null, ends_at: new Date(Date.now() + ms).toISOString() });

    const save = async () => {
        setSaving(true);
        try {
            await saveSettings(draft);
            toast.success("Settings saved");
        } catch {
            toast.error("Couldn't save settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-7">
            <section>
                <SectionTitle icon={SlidersHorizontal} title="Access" />
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <Row
                        title="Registration"
                        description="Allow anyone to create an account on this instance."
                        control={
                            <Switch
                                checked={draft.registration_enabled}
                                onChange={(v) => patch({ registration_enabled: v })}
                                label="Registration enabled"
                            />
                        }
                    />
                    <Row
                        title="Maintenance mode"
                        description="Lock the app for everyone except admins."
                        control={
                            <Switch
                                checked={draft.maintenance_mode}
                                onChange={(v) => patch({ maintenance_mode: v })}
                                label="Maintenance mode"
                            />
                        }
                    />
                    {draft.maintenance_mode && (
                        <div className="border-b border-border px-4 py-3 last:border-0">
                            <label className="mb-1.5 block text-[13px] font-medium text-fg">Maintenance message</label>
                            <Textarea
                                rows={2}
                                value={draft.maintenance_message}
                                onChange={(e) => patch({ maintenance_message: e.target.value })}
                                placeholder="Flux is undergoing maintenance. Please check back soon."
                            />
                        </div>
                    )}
                </div>
            </section>

            <section>
                <SectionTitle icon={Megaphone} title="Announcement banner" />
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <Row
                        title="Show banner"
                        description="A short message shown across the top of the app."
                        control={
                            <Switch
                                checked={announcementOn}
                                onChange={(v) => patchAnnouncement({ enabled: v })}
                                label="Show announcement"
                            />
                        }
                    />
                    {announcementOn && (
                        <div className="space-y-4 px-4 py-3.5">
                            <Input
                                value={announcement?.text ?? ""}
                                onChange={(e) => patchAnnouncement({ text: e.target.value })}
                                placeholder="e.g. New release out now — check What's new"
                            />
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                <label className="flex items-center gap-2 text-[12.5px] text-fg">
                                    <span className="text-subtle">Level</span>
                                    <Select
                                        className="h-8 w-36 text-[13px]"
                                        value={announcement?.level ?? "info"}
                                        onChange={(e) =>
                                            patchAnnouncement({ level: e.target.value as AnnouncementLevel })
                                        }
                                    >
                                        <option value="info">Info</option>
                                        <option value="warn">Warning</option>
                                        <option value="critical">Critical</option>
                                    </Select>
                                </label>
                                <label className="flex items-center gap-2 text-[12.5px] text-fg">
                                    <Switch
                                        checked={announcement?.dismissible ?? true}
                                        onChange={(v) => patchAnnouncement({ dismissible: v })}
                                        label="Dismissible"
                                    />
                                    <span>Users can dismiss it</span>
                                </label>
                            </div>

                            <div>
                                <p className="mb-1.5 text-[12px] font-medium text-subtle">Show for</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_DURATIONS.map(([label, ms]) => (
                                        <Button key={label} size="sm" variant="subtle" onClick={() => showFor(ms)}>
                                            {label}
                                        </Button>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="subtle"
                                        onClick={() => patchAnnouncement({ starts_at: null, ends_at: null })}
                                    >
                                        Always on
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        leftIcon={<CalendarClock size={14} />}
                                        onClick={() => setShowSchedule((v) => !v)}
                                    >
                                        Schedule
                                    </Button>
                                </div>
                                <p className="mt-2 text-[12px] text-subtle">
                                    {announcement ? scheduleSummary(announcement) : "Always on (until turned off)"}
                                </p>
                            </div>

                            {showSchedule && announcement && (
                                <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-bg p-3 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[12px] text-subtle">Start (optional)</span>
                                        <Input
                                            type="datetime-local"
                                            value={toLocalInput(announcement.starts_at)}
                                            onChange={(e) =>
                                                patchAnnouncement({ starts_at: fromLocalInput(e.target.value) })
                                            }
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[12px] text-subtle">End (optional)</span>
                                        <Input
                                            type="datetime-local"
                                            value={toLocalInput(announcement.ends_at)}
                                            onChange={(e) =>
                                                patchAnnouncement({ ends_at: fromLocalInput(e.target.value) })
                                            }
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <div className="flex items-center gap-2">
                <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
                    {saving ? "Saving…" : "Save changes"}
                </Button>
                {dirty && (
                    <Button variant="ghost" disabled={saving} onClick={() => settings && setDraft(settings)}>
                        Reset
                    </Button>
                )}
            </div>

            {config && <ConfigTable config={config} />}
        </div>
    );
}

function Row({ title, description, control }: { title: string; description: string; control: React.ReactNode }) {
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

function ConfigTable({ config }: { config: EffectiveConfig }) {
    return (
        <section>
            <SectionTitle icon={ServerCog} title="Configuration" />
            <p className="-mt-1.5 mb-2.5 text-[12px] text-subtle">
                Read-only. Only non-sensitive, product-level settings are shown.
            </p>
            <div className="space-y-4">
                {config.sections.map((section) => (
                    <div key={section.name} className="overflow-hidden rounded-xl border border-border">
                        <div className="bg-elevated px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                            {section.name}
                        </div>
                        <table className="w-full text-[12.5px]">
                            <tbody>
                                {section.entries.map((entry) => (
                                    <tr key={entry.key} className="border-t border-border">
                                        <td className="w-1/2 px-3 py-1.5 text-muted">{entry.key}</td>
                                        <td className="px-3 py-1.5 text-fg">{entry.value || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </section>
    );
}

function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function scheduleSummary(a: Announcement): string {
    const fmt = (iso: string) => new Date(iso).toLocaleString();
    if (a.starts_at && a.ends_at) return `Active ${fmt(a.starts_at)} → ${fmt(a.ends_at)}`;
    if (a.ends_at) return `Active until ${fmt(a.ends_at)}`;
    if (a.starts_at) return `Active from ${fmt(a.starts_at)}`;
    return "Always on (until turned off)";
}
