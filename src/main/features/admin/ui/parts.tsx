// Small shared building blocks for the admin dashboard sections.
import type { LucideIcon } from "lucide-react";

export function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
    return (
        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-fg">
            <Icon size={14} className="text-accent" />
            {title}
        </h2>
    );
}

export function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-wide text-subtle">{label}</p>
            <p className="mt-1 truncate text-[15px] font-semibold text-fg">{value}</p>
        </div>
    );
}

export function formatNumber(n: number): string {
    return n.toLocaleString("en-US");
}

export function formatUptime(seconds: number): string {
    const s = Math.floor(seconds);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}
