import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/main/common/utils/cn";
import type { CopyItem } from "../domain/types";

/** A one-click clipboard chip so the user pastes values instead of typing them. */
export function CopyChip({ item }: { item: CopyItem }) {
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard?.writeText(item.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            /* clipboard blocked (insecure context) - nothing actionable to show */
        }
    };

    return (
        <button
            type="button"
            onClick={onCopy}
            className="group flex w-full items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-left transition-colors hover:border-accent/60"
        >
            <code className={cn("min-w-0 flex-1 truncate text-[12px] text-fg", item.mono !== false && "mono")}>
                {item.label ?? item.value}
            </code>
            <span
                className={cn(
                    "flex shrink-0 items-center gap-1 text-[11px] font-medium transition-colors",
                    copied ? "text-emerald-400" : "text-subtle group-hover:text-accent",
                )}
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
            </span>
        </button>
    );
}
