import { CodeEditor } from "@/main/features/scripting/ui/CodeEditor";
import { cn } from "@/main/common/utils/cn";
import { JsonBodyEditor } from "../JsonBodyEditor";
import { KeyValueEditor } from "../KeyValueEditor";
import type { Body, BodyMode, HttpRequest } from "../../domain/models";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

const MODES: { id: BodyMode; label: string }[] = [
    { id: "none", label: "None" },
    { id: "json", label: "JSON" },
    { id: "text", label: "Text" },
    { id: "form", label: "Form" },
];

export function BodyTab({ request, update }: Props) {
    const body = request.body;
    const set = (patch: Partial<Body>) => update({ body: { ...body, ...patch } });

    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                {MODES.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => set({ mode: m.id })}
                        className={cn(
                            "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
                            body.mode === m.id ? "bg-accent text-white" : "text-muted hover:text-fg",
                        )}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {body.mode === "none" && <p className="text-[13px] text-subtle">This request has no body.</p>}
            {body.mode === "json" && <JsonBodyEditor raw={body.raw} onChange={(raw) => set({ raw })} />}
            {body.mode === "text" && (
                <CodeEditor value={body.raw} onChange={(raw) => set({ raw })} placeholder="Raw body…" minHeight={200} />
            )}
            {body.mode === "form" && (
                <KeyValueEditor rows={body.form} onChange={(form) => set({ form })} keyPlaceholder="field" />
            )}
        </div>
    );
}
