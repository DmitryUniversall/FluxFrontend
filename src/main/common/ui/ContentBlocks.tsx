// Shared renderer for typed prose blocks, used by both the documentation wiki and
// the changelog so neither duplicates the rendering logic. The canonical block
// model mirrors the backend ReleaseBlock union (kind-discriminated). Interactive
// "demo" blocks are rendered by an injected callback so this module stays free of
// feature dependencies. Image/link URLs are validated as http(s) before render.
import type { ReactNode } from "react";
import { cn } from "@/main/common/utils/cn";

export type BadgeKind = "added" | "changed" | "fixed" | "removed";
export type DemoKind = "template" | "dynamics" | "expression";

export type ContentBlock =
    | { kind: "heading"; text: string }
    | { kind: "paragraph"; text: string }
    | { kind: "list"; items: string[] }
    | { kind: "steps"; items: string[] }
    | { kind: "code"; text: string }
    | { kind: "note"; text: string }
    | { kind: "badge"; badge: BadgeKind; text: string }
    | { kind: "image"; src: string; alt?: string }
    | { kind: "linkButton"; href: string; label: string }
    | { kind: "demo"; demo: DemoKind };

const BADGE_STYLES: Record<BadgeKind, string> = {
    added: "bg-emerald-500/15 text-emerald-400",
    changed: "bg-sky-500/15 text-sky-400",
    fixed: "bg-amber-500/15 text-amber-300",
    removed: "bg-red-500/15 text-red-300",
};

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function ContentBlocks({
    blocks,
    renderDemo,
}: {
    blocks: ContentBlock[];
    renderDemo?: (demo: DemoKind) => ReactNode;
}) {
    return (
        <div className="space-y-3.5">
            {blocks.map((block, i) => (
                <Block key={i} block={block} renderDemo={renderDemo} />
            ))}
        </div>
    );
}

function Block({ block, renderDemo }: { block: ContentBlock; renderDemo?: (demo: DemoKind) => ReactNode }) {
    switch (block.kind) {
        case "heading":
            return <h2 className="pt-2 text-[15px] font-semibold text-fg">{block.text}</h2>;
        case "paragraph":
            return <p className="text-[13.5px] leading-relaxed text-muted">{block.text}</p>;
        case "list":
            return (
                <ul className="space-y-1.5">
                    {block.items.map((it, i) => (
                        <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                            <span>{it}</span>
                        </li>
                    ))}
                </ul>
            );
        case "steps":
            return (
                <ol className="space-y-1.5">
                    {block.items.map((it, i) => (
                        <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                                {i + 1}
                            </span>
                            <span className="pt-px">{it}</span>
                        </li>
                    ))}
                </ol>
            );
        case "code":
            return (
                <pre className="mono overflow-x-auto rounded-lg border border-border bg-surface p-3 text-[12.5px] text-fg">
                    {block.text}
                </pre>
            );
        case "note":
            return (
                <div className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg">
                    {block.text}
                </div>
            );
        case "badge":
            // Fixed-width, centered label so consecutive badges line their text into a column.
            return (
                <div className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
                    <span
                        className={cn(
                            "mt-0.5 inline-flex min-w-[72px] shrink-0 justify-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                            BADGE_STYLES[block.badge],
                        )}
                    >
                        {block.badge}
                    </span>
                    <span>{block.text}</span>
                </div>
            );
        case "image":
            if (!isHttpUrl(block.src)) return null;
            return (
                <img
                    src={block.src}
                    alt={block.alt ?? ""}
                    className="max-w-full rounded-lg border border-border"
                    loading="lazy"
                />
            );
        case "linkButton":
            if (!isHttpUrl(block.href)) return null;
            return (
                <a
                    href={block.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white shadow-sm shadow-accent/20 transition-all hover:brightness-110"
                >
                    {block.label}
                </a>
            );
        case "demo":
            return <>{renderDemo?.(block.demo)}</>;
    }
}
