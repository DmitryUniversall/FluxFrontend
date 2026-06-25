// Bottom drawer showing the request history - a compact, Postman-style console.
// Each row is one proxied exchange; expand to see request/response headers and
// bodies. Failed/error exchanges are tinted red.
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MethodBadge, statusColor } from "@/main/common/ui/badges";
import { IconButton } from "@/main/common/ui/Button";
import { Input } from "@/main/common/ui/Field";
import { ANCHORS, tourAnchor } from "@/main/features/guide/domain/anchors";
import { formatBytes, formatMs } from "@/main/common/utils/format";
import { cn } from "@/main/common/utils/cn";
import type { ConsoleEntry } from "../domain/models";
import { useRequestConsole } from "./useRequestConsole";

const fmtTime = (at: number) => new Date(at).toLocaleTimeString();

const isFailure = (e: ConsoleEntry) => !!e.error || (e.status !== undefined && e.status >= 400);

export function RequestConsolePanel() {
    const { open, entries, clear, setOpen } = useRequestConsole();
    const [filter, setFilter] = useState("");

    const shown = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((e) => `${e.method} ${e.url} ${e.status ?? ""}`.toLowerCase().includes(q));
    }, [entries, filter]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-x-0 bottom-0 z-40 flex h-[44vh] flex-col border-t border-border bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    {...tourAnchor(ANCHORS.consolePanel)}
                >
                    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
                        <span className="text-[12px] font-semibold uppercase tracking-wide text-subtle">Console</span>
                        <span className="mono text-[11px] text-subtle">{entries.length}</span>
                        <Input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Filter by method, url, status…"
                            className="ml-2 h-7 max-w-xs flex-1 text-[12px]"
                        />
                        <div className="flex-1" />
                        <IconButton label="Clear console" onClick={clear}>
                            <Trash2 size={14} />
                        </IconButton>
                        <IconButton label="Close" onClick={() => setOpen(false)}>
                            <X size={15} />
                        </IconButton>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {shown.length === 0 ? (
                            <p className="px-4 py-10 text-center text-[12px] text-subtle">
                                {entries.length === 0
                                    ? "No requests yet - send a request or run a flow."
                                    : "No matches."}
                            </p>
                        ) : (
                            shown.map((e) => <Row key={e.id} entry={e} />)
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Row({ entry }: { entry: ConsoleEntry }) {
    const [open, setOpen] = useState(false);
    const failed = isFailure(entry);

    return (
        <div className={cn("border-b border-border/60", failed && "bg-red-500/5")}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-elevated/40"
            >
                <ChevronRight
                    size={13}
                    className={cn("shrink-0 text-subtle transition-transform", open && "rotate-90")}
                />
                <span className="mono shrink-0 text-[11px] text-subtle">{fmtTime(entry.at)}</span>
                <MethodBadge method={entry.method} className="w-12 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{entry.url || "(no url)"}</span>
                {entry.error ? (
                    <span className="mono shrink-0 text-[11px] font-semibold text-red-400">ERR</span>
                ) : (
                    <span className={cn("mono shrink-0 text-[11px] font-semibold", statusColor(entry.status ?? 0))}>
                        {entry.status} {entry.statusText}
                    </span>
                )}
                <span className="mono shrink-0 text-[11px] text-subtle">
                    {formatMs(entry.timeMs ?? entry.durationMs)}
                </span>
                {entry.sizeBytes !== undefined && (
                    <span className="mono shrink-0 text-[11px] text-subtle">{formatBytes(entry.sizeBytes)}</span>
                )}
            </button>

            {open && (
                <div className="space-y-3 px-3 pb-3 pt-1">
                    {entry.error && (
                        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-[12px] text-red-300">
                            {entry.error}
                        </div>
                    )}
                    <Section title="Request">
                        <div className="mono break-all text-[12px] text-muted">
                            <span className={cn("font-semibold", failed ? "text-red-200" : "text-fg")}>
                                {entry.method}
                            </span>{" "}
                            {entry.url}
                        </div>
                        <Headers data={entry.requestHeaders} />
                        <Body body={entry.requestBody} failed={failed} />
                    </Section>
                    {!entry.error && (
                        <Section title="Response">
                            <Headers data={entry.responseHeaders ?? {}} />
                            <Body body={entry.responseBody ?? ""} failed={failed} />
                        </Section>
                    )}
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-subtle">{title}</div>
            {children}
        </div>
    );
}

function Headers({ data }: { data: Record<string, string> }) {
    const rows = Object.entries(data ?? {});
    if (rows.length === 0) return null;
    return (
        <div className="mono space-y-0.5 text-[12px]">
            {rows.map(([k, v]) => (
                <div key={k} className="break-all">
                    <span className="text-accent">{k}</span>
                    <span className="text-subtle">: </span>
                    <span className="text-muted">{v}</span>
                </div>
            ))}
        </div>
    );
}

function Body({ body, failed }: { body: string | null; failed: boolean }) {
    if (!body) return null;
    return (
        <pre
            className={cn(
                "mono max-h-48 overflow-auto whitespace-pre-wrap break-all rounded p-2 text-[12px] text-muted",
                failed ? "bg-red-500/5" : "bg-bg",
            )}
        >
            {pretty(body)}
        </pre>
    );
}

// Pretty-print JSON bodies; leave anything else untouched.
function pretty(body: string): string {
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body;
    }
}
