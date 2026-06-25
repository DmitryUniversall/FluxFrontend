// One node of the collapsible JSON tree. Containers keep their own open state
// (open by default near the root). Every row is right-clickable, which is how a
// field gets sent to the "save to environment" flow.
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { kindOf, pathToDisplay } from "@/core/json-path";
import type { Json, JsonPath } from "@/core/types";
import { cn } from "@/main/common/utils/cn";

interface JsonNodeProps {
    name?: string | number;
    value: Json;
    path: JsonPath;
    depth: number;
    onContext: (e: React.MouseEvent, path: JsonPath, value: Json) => void;
}

export function JsonNode({ name, value, path, depth, onContext }: JsonNodeProps) {
    const kind = kindOf(value);
    const isContainer = kind === "object" || kind === "array";
    const [open, setOpen] = useState(depth < 2);

    const indent = { paddingLeft: depth * 14 + 8 };
    const keyLabel = name !== undefined && (
        <span className="text-sky-300">{typeof name === "number" ? name : `"${name}"`}</span>
    );

    if (!isContainer) {
        return (
            <div
                className="group flex cursor-default items-start rounded px-1 leading-6 hover:bg-elevated/60"
                style={indent}
                onContextMenu={(e) => onContext(e, path, value)}
            >
                {keyLabel && (
                    <>
                        {keyLabel}
                        <span className="text-subtle">:&nbsp;</span>
                    </>
                )}
                <Leaf value={value} />
            </div>
        );
    }

    const entries: [string | number, Json][] = Array.isArray(value)
        ? value.map((v, i) => [i, v])
        : Object.entries(value as Record<string, Json>);
    const count = entries.length;
    const open_b = Array.isArray(value) ? "[" : "{";
    const close_b = Array.isArray(value) ? "]" : "}";

    return (
        <div>
            <div
                className="group flex cursor-pointer items-center rounded px-1 leading-6 hover:bg-elevated/60"
                style={indent}
                onClick={() => setOpen((v) => !v)}
                onContextMenu={(e) => onContext(e, path, value)}
            >
                <ChevronRight
                    size={13}
                    className={cn("mr-0.5 shrink-0 text-subtle transition-transform", open && "rotate-90")}
                />
                {keyLabel && (
                    <>
                        {keyLabel}
                        <span className="text-subtle">:&nbsp;</span>
                    </>
                )}
                <span className="text-subtle">{open_b}</span>
                {!open && (
                    <span className="mx-1 text-subtle">
                        {count} {count === 1 ? "item" : "items"}
                        {close_b}
                    </span>
                )}
            </div>
            {open && (
                <>
                    {entries.map(([k, v]) => (
                        <JsonNode
                            key={pathToDisplay([...path, k])}
                            name={k}
                            value={v}
                            path={[...path, k]}
                            depth={depth + 1}
                            onContext={onContext}
                        />
                    ))}
                    <div className="leading-6 text-subtle" style={{ paddingLeft: depth * 14 + 8 + 18 }}>
                        {close_b}
                    </div>
                </>
            )}
        </div>
    );
}

function Leaf({ value }: { value: Json }) {
    const kind = kindOf(value);
    if (kind === "string") return <span className="break-all text-emerald-300">"{String(value)}"</span>;
    if (kind === "number") return <span className="text-amber-300">{String(value)}</span>;
    if (kind === "boolean") return <span className="text-violet-300">{String(value)}</span>;
    return <span className="text-subtle">null</span>;
}
