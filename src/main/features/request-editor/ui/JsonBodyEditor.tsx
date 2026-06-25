// JSON body editor with a Form <-> Raw toggle and two-way sync. The raw string is
// the source of truth (sent as-is, with {{...}} resolved). Form edits serialize
// back to raw; raw edits reparse into the tree. Invalid raw keeps the last good
// tree and shows an indicator instead of clobbering anything.
import { AlertTriangle, Braces, Code2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { emptyObject, parseTemplateJson, serializeTemplateJson, type JsonNode } from "@/core/json-template";
import { cn } from "@/main/common/utils/cn";
import { CodeEditor } from "@/main/features/scripting/ui/CodeEditor";
import { JsonBuilder } from "./JsonBuilder";

export function JsonBodyEditor({ raw, onChange }: { raw: string; onChange: (raw: string) => void }) {
    const [view, setView] = useState<"form" | "raw">("form");
    const [tree, setTree] = useState<JsonNode>(() => {
        const r = parseTemplateJson(raw);
        return r.ok ? r.node : emptyObject();
    });
    const [error, setError] = useState<string | null>(() => {
        const r = parseTemplateJson(raw);
        return r.ok ? null : r.error;
    });
    const lastEmitted = useRef(raw);

    // Reparse when raw changes externally (or when switching into form view).
    useEffect(() => {
        if (view !== "form") return;
        if (raw === lastEmitted.current) return;
        const r = parseTemplateJson(raw);
        if (r.ok) {
            setTree(r.node);
            setError(null);
            lastEmitted.current = raw;
        } else {
            setError(r.error);
        }
    }, [raw, view]);

    const onTree = (node: JsonNode) => {
        setTree(node);
        setError(null);
        const s = serializeTemplateJson(node);
        lastEmitted.current = s;
        onChange(s);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                    {(
                        [
                            { id: "form", label: "Form", icon: <Braces size={13} /> },
                            { id: "raw", label: "Raw", icon: <Code2 size={13} /> },
                        ] as const
                    ).map((o) => (
                        <button
                            key={o.id}
                            onClick={() => setView(o.id)}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
                                view === o.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                            )}
                        >
                            {o.icon}
                            {o.label}
                        </button>
                    ))}
                </div>
                {view === "form" && error && (
                    <span className="flex items-center gap-1.5 text-[12px] text-amber-400">
                        <AlertTriangle size={13} /> Raw isn't valid JSON - switch to Raw to fix
                    </span>
                )}
            </div>

            {view === "form" ? (
                <JsonBuilder node={tree} onChange={onTree} />
            ) : (
                <CodeEditor value={raw} onChange={onChange} placeholder={'{\n  "key": "value"\n}'} minHeight={200} />
            )}
        </div>
    );
}
