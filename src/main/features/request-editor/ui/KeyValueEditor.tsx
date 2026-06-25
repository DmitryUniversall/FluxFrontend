// Reusable key/value rows used for params, headers and form bodies. A trailing
// blank row appears automatically so adding entries feels effortless. The ∅
// toggle drops a pair from the request when its value is empty.
import { CircleSlash, Trash2 } from "lucide-react";
import { IconButton } from "@/main/common/ui/Button";
import { Checkbox } from "@/main/common/ui/Field";
import { HighlightedInput } from "@/main/common/ui/HighlightedInput";
import { cn } from "@/main/common/utils/cn";
import type { KeyValue } from "../domain/models";

interface Props {
    rows: KeyValue[];
    onChange: (rows: KeyValue[]) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
}

export function KeyValueEditor({ rows, onChange, keyPlaceholder = "key", valuePlaceholder = "value" }: Props) {
    // Always render one extra blank row for quick entry.
    const display = [...rows, { key: "", value: "", enabled: true }];

    const edit = (i: number, patch: Partial<KeyValue>) => {
        const next = display.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
        // drop fully-empty rows except keep editing continuity
        onChange(next.filter((r, idx) => idx === next.length - 1 || r.key !== "" || r.value !== ""));
    };
    const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

    return (
        <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex border-b border-border bg-surface text-[11px] font-medium uppercase tracking-wide text-subtle">
                <span className="w-9 shrink-0" />
                <span className="flex-1 px-2.5 py-1.5">Key</span>
                <span className="flex-1 border-l border-border px-2.5 py-1.5">Value</span>
                <span
                    className="flex w-8 shrink-0 items-center justify-center border-l border-border py-1.5"
                    title="Skip when value is empty"
                >
                    ∅
                </span>
                <span className="w-8 shrink-0" />
            </div>
            {display.map((row, i) => {
                const isGhost = i === display.length - 1;
                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-center border-b border-border last:border-0",
                            isGhost && "opacity-70",
                        )}
                    >
                        <div className="flex w-9 shrink-0 justify-center">
                            {!isGhost && (
                                <Checkbox
                                    checked={row.enabled}
                                    onChange={(e) => edit(i, { enabled: e.target.checked })}
                                />
                            )}
                        </div>
                        <HighlightedInput
                            value={row.key}
                            onChange={(v) => edit(i, { key: v })}
                            placeholder={keyPlaceholder}
                            wrapperClassName="h-8 flex-1"
                            textClassName="px-2.5 mono text-[13px]"
                        />
                        <HighlightedInput
                            value={row.value}
                            onChange={(v) => edit(i, { value: v })}
                            placeholder={valuePlaceholder}
                            wrapperClassName="h-8 flex-1 border-l border-border"
                            textClassName="px-2.5 mono text-[13px]"
                        />
                        <div className="flex w-8 shrink-0 items-center justify-center border-l border-border">
                            {!isGhost && (
                                <button
                                    onClick={() => edit(i, { send_empty: row.send_empty === false ? true : false })}
                                    title={
                                        row.send_empty === false
                                            ? "Skipped when empty - click to always send"
                                            : "Always sent - click to skip when empty"
                                    }
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                                        row.send_empty === false
                                            ? "bg-accent/15 text-accent"
                                            : "text-subtle hover:text-fg",
                                    )}
                                >
                                    <CircleSlash size={13} />
                                </button>
                            )}
                        </div>
                        <div className="flex w-8 shrink-0 justify-center">
                            {!isGhost && (
                                <IconButton label="Remove" onClick={() => remove(i)}>
                                    <Trash2 size={13} />
                                </IconButton>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
