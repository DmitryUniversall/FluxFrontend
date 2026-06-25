// Shared building blocks for the settings sections: a page header, a bordered
// card grouping rows, and a labelled row with a control on the right (the
// GitHub-style settings layout, in the app's dark theme).
import type { ReactNode } from "react";
import { cn } from "@/main/common/utils/cn";

export function SettingsPage({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="mx-auto max-w-3xl px-6 py-6">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-3">
                <div>
                    <h2 className="text-lg font-semibold text-fg">{title}</h2>
                    {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="space-y-6">{children}</div>
        </div>
    );
}

export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
    return (
        <section>
            {title && <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-subtle">{title}</h3>}
            <div className="overflow-hidden rounded-xl border border-border bg-surface">{children}</div>
        </section>
    );
}

/** A row inside a SettingsGroup: title + optional description on the left, a
 *  control (toggle, select, button…) on the right. */
export function SettingRow({
    title,
    description,
    control,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    control?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-4 border-b border-border px-4 py-3 last:border-0", className)}>
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-fg">{title}</div>
                {description && <div className="mt-0.5 text-[12px] leading-snug text-subtle">{description}</div>}
            </div>
            {control && <div className="shrink-0">{control}</div>}
        </div>
    );
}

/** A standalone field block (label + control stacked) for forms inside a card. */
export function SettingField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="px-4 py-3.5">
            <label className="mb-1.5 block text-[13px] font-medium text-fg">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-[12px] text-subtle">{hint}</p>}
        </div>
    );
}
