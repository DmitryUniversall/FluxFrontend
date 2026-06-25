import { ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { cn } from "@/main/common/utils/cn";
import { KeyValueEditor } from "../KeyValueEditor";
import { computeAutoHeaders } from "../autoHeaders";
import type { HttpRequest } from "../../domain/models";

interface Props {
    request: HttpRequest;
    update: (patch: Partial<HttpRequest>) => void;
}

export function HeadersTab({ request, update }: Props) {
    const [show, setShow] = useState(false);
    const activeEnvId = useEnvironments((s) => s.activeId);

    // Recompute when the request or the active environment changes (the env can
    // affect Host and Content-Length via {{templates}}).
    const auto = useMemo(() => computeAutoHeaders(request), [request, activeEnvId]);

    return (
        <div className="space-y-3 p-4">
            <KeyValueEditor
                rows={request.headers}
                onChange={(headers) => update({ headers })}
                keyPlaceholder="header"
                valuePlaceholder="value"
            />

            {auto.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-dashed border-border">
                    <button
                        onClick={() => setShow((v) => !v)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-subtle hover:text-fg"
                    >
                        <ChevronRight size={13} className={cn("transition-transform", show && "rotate-90")} />
                        <Sparkles size={12} className="text-sky-400/70" />
                        <span className="font-medium">
                            {show ? "Hide" : "Show"} {auto.length} auto-generated header{auto.length > 1 ? "s" : ""}
                        </span>
                    </button>

                    {show && (
                        <div className="border-t border-border">
                            <p className="px-3 py-1.5 text-[11px] text-subtle">
                                Added automatically when the request is sent. Add a header above with the same name to
                                override one.
                            </p>
                            {auto.map((h) => (
                                <div
                                    key={h.key}
                                    className="flex items-center border-t border-border/60 text-[12.5px] text-sky-300/80"
                                >
                                    <span className="mono flex-1 px-3 py-1.5">{h.key}</span>
                                    <span
                                        className="mono flex-1 truncate border-l border-border/60 px-3 py-1.5 text-sky-200/70"
                                        title={h.value}
                                    >
                                        {h.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
