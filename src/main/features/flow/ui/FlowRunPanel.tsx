// Flow run panel - replaces the response pane for flow nodes. Shows captured
// flow-scope variables and a per-step timeline with status, timing and an
// expandable request/response for each step.
import { CheckCircle2, ChevronRight, Circle, MinusCircle, Workflow, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/main/common/ui/feedback";
import { statusColor } from "@/main/common/ui/badges";
import { cn } from "@/main/common/utils/cn";
import { JsonView } from "@/main/features/response-viewer/ui/JsonView";
import type { StepResult, StepStatus } from "../domain/runner";
import { useFlowEditor } from "./useFlowEditor";

const statusIcon = (s: StepStatus) => {
    if (s === "passed") return <CheckCircle2 size={15} className="text-emerald-400" />;
    if (s === "failed") return <XCircle size={15} className="text-red-400" />;
    if (s === "running") return <Circle size={15} className="animate-pulse text-accent" />;
    if (s === "skipped") return <MinusCircle size={15} className="text-subtle" />;
    return <Circle size={15} className="text-subtle/50" />;
};

function StepCard({ r }: { r: StepResult }) {
    const failed = r.status === "failed";
    const expandable = !!(r.request || r.response);
    const [open, setOpen] = useState(false);

    // Open failed steps automatically so the (red) request/response is right there
    // to inspect; fires once on entering the failed state, manual collapse sticks.
    useEffect(() => {
        if (failed && expandable) setOpen(true);
    }, [failed, expandable]);

    return (
        <div
            className={cn("rounded-lg border", failed ? "border-red-500/30 bg-red-500/5" : "border-border bg-surface")}
        >
            <button
                onClick={() => expandable && setOpen((v) => !v)}
                className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left", expandable && "cursor-pointer")}
            >
                {statusIcon(r.status)}
                <span className="min-w-0 flex-1">
                    <span className={cn("text-[13px]", failed ? "text-red-200" : "text-fg")}>{r.title}</span>
                    {r.detail && (
                        <span className={cn("ml-2 text-[12px]", failed ? "text-red-400" : "text-subtle")}>
                            {r.detail}
                        </span>
                    )}
                </span>
                {r.timeMs !== undefined && <span className="mono shrink-0 text-[11px] text-subtle">{r.timeMs}ms</span>}
                {expandable && (
                    <ChevronRight
                        size={14}
                        className={cn(
                            "shrink-0 transition-transform",
                            failed ? "text-red-400/70" : "text-subtle",
                            open && "rotate-90",
                        )}
                    />
                )}
            </button>

            {open && expandable && (
                <div className={cn("space-y-2 border-t px-3 py-2", failed ? "border-red-500/20" : "border-border")}>
                    {r.request && (
                        <div>
                            <div
                                className={cn(
                                    "mb-1 text-[11px] uppercase tracking-wide",
                                    failed ? "text-red-400/80" : "text-subtle",
                                )}
                            >
                                Request
                            </div>
                            <div className="mono break-all text-[12px] text-muted">
                                <span className={cn("font-semibold", failed ? "text-red-200" : "text-fg")}>
                                    {r.request.method}
                                </span>{" "}
                                {r.request.url}
                            </div>
                            {r.request.body && (
                                <pre
                                    className={cn(
                                        "mono mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded p-2 text-[12px] text-muted",
                                        failed ? "bg-red-500/5" : "bg-bg",
                                    )}
                                >
                                    {r.request.body}
                                </pre>
                            )}
                        </div>
                    )}
                    {r.response && (
                        <div>
                            <div
                                className={cn(
                                    "mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide",
                                    failed ? "text-red-400/80" : "text-subtle",
                                )}
                            >
                                Response{" "}
                                <span className={cn("mono", statusColor(r.response.status))}>{r.response.status}</span>
                            </div>
                            {r.response.json !== undefined ? (
                                <div
                                    className={cn("max-h-56 overflow-auto rounded", failed ? "bg-red-500/5" : "bg-bg")}
                                >
                                    <JsonView data={r.response.json} />
                                </div>
                            ) : (
                                <pre
                                    className={cn(
                                        "mono max-h-40 overflow-auto whitespace-pre-wrap break-all rounded p-2 text-[12px] text-muted",
                                        failed ? "bg-red-500/5" : "bg-bg",
                                    )}
                                >
                                    {r.response.body || "(empty)"}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function FlowRunPanel() {
    const { results, vars, running } = useFlowEditor();
    const varEntries = Object.entries(vars);

    if (results.length === 0) {
        return (
            <EmptyState
                icon={<Workflow size={24} />}
                title={running ? "Running…" : "No run yet"}
                hint="Press Run to execute the flow. Step results, captured variables and timings appear here."
            />
        );
    }

    return (
        <div className="flex h-full flex-col">
            {varEntries.length > 0 && (
                <div className="border-b border-border px-4 py-2.5">
                    <div className="mb-1.5 text-[11px] uppercase tracking-wide text-subtle">Flow variables</div>
                    <div className="flex flex-wrap gap-1.5">
                        {varEntries.map(([k, v]) => (
                            <span
                                key={k}
                                className="mono rounded-md border border-border bg-surface px-2 py-0.5 text-[12px]"
                            >
                                <span className="text-accent">{k}</span>
                                <span className="text-subtle"> = </span>
                                <span className="text-muted">{v.length > 40 ? v.slice(0, 40) + "…" : v}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
                {results.map((r) => (
                    <div key={r.id} style={{ marginLeft: r.depth * 16 }}>
                        <StepCard r={r} />
                    </div>
                ))}
            </div>
        </div>
    );
}
