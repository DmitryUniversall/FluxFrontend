// Response viewer for the landing demos. A prop-driven twin of the app's
// ResponsePanel (which is bound to the request-editor store): same status strip,
// Body / Headers / Console / Tests tabs and Tree/Raw toggle, reusing the real
// JsonNode tree renderer - but with no global-store coupling.
import { AlertCircle, CheckCircle2, Inbox, XCircle } from "lucide-react";
import { useState } from "react";
import { Tabs, type TabItem } from "@/main/common/ui/Tabs";
import { EmptyState, Spinner } from "@/main/common/ui/feedback";
import { statusColor } from "@/main/common/ui/badges";
import { cn } from "@/main/common/utils/cn";
import { formatBytes, formatMs } from "@/main/common/utils/format";
import type { AssertResult, ResponseView } from "@/main/features/scripting/domain/context";
import { JsonNode } from "@/main/features/response-viewer/ui/JsonNode";

interface Props {
    response: ResponseView | null;
    logs: string[];
    tests: AssertResult[];
    error: string | null;
    sending: boolean;
}

export function DemoResponse({ response, logs, tests, error, sending }: Props) {
    const [tab, setTab] = useState("body");
    const [raw, setRaw] = useState(false);

    if (sending) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-subtle">
                <Spinner className="h-4 w-4" /> <span className="text-[13px]">Sending request…</span>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="flex max-w-md items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                    <div>
                        <p className="text-[13px] font-medium text-red-300">Request failed</p>
                        <p className="mt-1 text-[13px] text-muted">{error}</p>
                    </div>
                </div>
            </div>
        );
    }
    if (!response) {
        return (
            <EmptyState
                icon={<Inbox size={24} />}
                title="No response yet"
                hint="Send the request to inspect the response here."
            />
        );
    }

    const headerEntries = Object.entries(response.headers);
    const passed = tests.filter((t) => t.passed).length;
    const allPass = tests.length > 0 && passed === tests.length;
    const tabs: TabItem[] = [
        { id: "body", label: "Body" },
        { id: "headers", label: "Headers", badge: headerEntries.length || undefined },
        { id: "console", label: "Console", badge: logs.length || undefined },
        { id: "tests", label: "Tests", badge: tests.length || undefined },
    ];
    const hasJson = response.json !== undefined;

    return (
        <div className="flex h-full flex-col">
            {/* status strip */}
            <div className="flex items-center gap-4 border-b border-border px-4 py-2.5 text-[13px]">
                <span className={cn("mono font-semibold", statusColor(response.status))}>
                    {response.status} {response.statusText}
                </span>
                <span className="text-muted">{formatMs(response.timeMs)}</span>
                <span className="text-muted">{formatBytes(response.sizeBytes)}</span>
                {tests.length > 0 && (
                    <button
                        onClick={() => setTab("tests")}
                        className={cn(
                            "mono rounded-md px-1.5 py-0.5 text-[12px] font-semibold",
                            allPass ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                        )}
                    >
                        {passed}/{tests.length} tests
                    </button>
                )}
                <div className="flex-1" />
                {tab === "body" && hasJson && (
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
                        {[
                            { id: false, label: "Tree" },
                            { id: true, label: "Raw" },
                        ].map((o) => (
                            <button
                                key={String(o.id)}
                                onClick={() => setRaw(o.id)}
                                className={cn(
                                    "rounded-md px-2.5 py-0.5 text-[12px] font-medium transition-colors",
                                    raw === o.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4">
                <Tabs items={tabs} active={tab} onChange={setTab} size="sm" />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
                {tab === "body" &&
                    (hasJson && !raw ? (
                        <div className="mono p-3 text-[13px]">
                            <JsonNode value={response.json!} path={[]} depth={0} onContext={(e) => e.preventDefault()} />
                        </div>
                    ) : (
                        <pre className="mono whitespace-pre-wrap break-all p-4 text-[13px] text-fg">
                            {response.body || <span className="text-subtle">(empty body)</span>}
                        </pre>
                    ))}

                {tab === "headers" && (
                    <div className="p-3">
                        {headerEntries.length === 0 ? (
                            <p className="px-1 text-[13px] text-subtle">No headers</p>
                        ) : (
                            <div className="mono space-y-1 text-[13px]">
                                {headerEntries.map(([k, v]) => (
                                    <div key={k} className="flex gap-2 border-b border-border/60 py-1 last:border-0">
                                        <span className="shrink-0 text-sky-300">{k}:</span>
                                        <span className="break-all text-muted">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === "console" && (
                    <div className="p-3">
                        {logs.length === 0 ? (
                            <p className="px-1 text-[13px] text-subtle">
                                No logs. Script blocks and <code className="mono">console.log</code> output appear here.
                            </p>
                        ) : (
                            <div className="mono space-y-0.5 text-[13px] text-muted">
                                {logs.map((line, i) => (
                                    <div key={i} className="whitespace-pre-wrap break-all">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === "tests" && (
                    <div className="space-y-1.5 p-3">
                        {tests.length === 0 ? (
                            <p className="px-1 text-[13px] text-subtle">No assertions ran.</p>
                        ) : (
                            tests.map((t, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex items-start gap-2.5 rounded-lg border px-3 py-2",
                                        t.passed
                                            ? "border-emerald-500/20 bg-emerald-500/5"
                                            : "border-red-500/25 bg-red-500/5",
                                    )}
                                >
                                    {t.passed ? (
                                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                                    ) : (
                                        <XCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-[13px] text-fg">{t.label}</p>
                                        {!t.passed && t.detail && (
                                            <p className="mono mt-0.5 break-all text-[12px] text-red-300/80">
                                                {t.detail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
