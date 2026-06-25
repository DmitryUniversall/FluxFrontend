// Instance-wide chrome shown under the top bar: the admin announcement banner and,
// during maintenance, a notice (admins still get in; non-admins are gated out).
// Dismissible banners get a close button; the dismissal sticks (per banner) until
// its content changes. Sticky banners can't be closed.
import { AlertTriangle, Megaphone, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/main/common/utils/cn";
import type { Announcement, AnnouncementLevel } from "@/main/features/admin/domain/models";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";

const LEVEL: Record<AnnouncementLevel, string> = {
    info: "border-accent/30 bg-accent/15 text-accent",
    warn: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    critical: "border-red-500/30 bg-red-500/15 text-red-300",
};

const STORAGE_KEY = "flux.dismissedAnnouncement";

// A banner is identified by its content + window, so editing it re-shows a dismissed one.
function signature(a: Announcement): string {
    return [a.text, a.level, a.starts_at ?? "", a.ends_at ?? ""].join("|");
}

export function InstanceBanner() {
    const meta = useInstanceMeta((s) => s.meta);
    const [dismissed, setDismissed] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

    if (!meta) return null;
    const announcement = meta.announcement;
    const sig = announcement ? signature(announcement) : null;
    const bannerHidden = announcement?.dismissible && dismissed === sig;

    const dismiss = () => {
        if (!sig) return;
        localStorage.setItem(STORAGE_KEY, sig);
        setDismissed(sig);
    };

    return (
        <>
            {announcement && !bannerHidden && (
                <div
                    className={cn(
                        "flex items-center gap-2 border-b px-4 py-1.5 text-[12.5px] font-medium",
                        LEVEL[announcement.level],
                    )}
                >
                    <Megaphone size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{announcement.text}</span>
                    {announcement.dismissible && (
                        <button
                            onClick={dismiss}
                            aria-label="Dismiss"
                            className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}
            {meta.maintenance_mode && (
                <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-1.5 text-[12.5px] font-medium text-amber-300">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Maintenance mode is on — only admins can use the app.</span>
                </div>
            )}
        </>
    );
}
