// "Run & watch" Flow demo for the landing page. It runs a prebuilt scenario
// (log in → capture the token → fetch a user as Bearer → assert 200) through the
// REAL flow runner (runFlow), injected with the public preview repository, and
// renders the live step timeline + captured variables. No editing, no app store.
import { CheckCircle2, ChevronRight, Circle, Loader2, Play, Square, XCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/main/common/utils/cn";
import { formatMs } from "@/main/common/utils/format";
import { statusColor } from "@/main/common/ui/badges";
import { JsonNode } from "@/main/features/response-viewer/ui/JsonNode";
import { runFlow, type StepResult, type StepStatus } from "@/main/features/flow/domain/runner";
import { demoEnvironment, demoFlowSteps } from "../../data/demoData";
import { previewRepository } from "../../data/previewRepository";

const SCENARIO = [
    "Call Login — capture {{token}} from the response",
    "Call Get user as Bearer {{token}} — capture {{userName}}",
    "Assert the response is 200 OK",
];

function StatusIcon({ status }: { status: StepStatus }) {
    switch (status) {
        case "passed":
            return <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />;
        case "failed":
            return <XCircle size={16} className="shrink-0 text-red-400" />;
        case "running":
            return <Loader2 size={16} className="shrink-0 animate-spin text-accent" />;
        default:
            return <Circle size={16} className="shrink-0 text-subtle" />;
    }
}

export function FlowDemo() {
    const env = useMemo(() => demoEnvironment(), []);
    const steps = useMemo(() => demoFlowSteps(), []);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<StepResult[]>([]);
    const [vars, setVars] = useState<Record<string, string>>({});
    const [open, setOpen] = useState<Set<string>>(new Set());
    const cancelled = useRef(false);

    const run = async () => {
        if (running) return;
        cancelled.current = false;
        setRunning(true);
        setResults([]);
        setVars({});
        setOpen(new Set());
        try {
            await runFlow(
                steps,
                env,
                (u) => {
                    setResults(u.results);
                    setVars(u.vars);
                },
                () => cancelled.current,
                async () => {},
                null,
                (a) => a,
                previewRepository,
            );
        } finally {
            setRunning(false);
        }
    };

    const stop = () => {
        cancelled.current = true;
        setRunning(false);
    };

    const toggle = (id: string) =>
        setOpen((s) => {
            const next = new Set(s);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const varEntries = Object.entries(vars).filter(([, v]) => v !== "");

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            {/* run bar */}
            <div className="flex items-center gap-3 border-b border-border bg-elevated/40 px-4 py-3">
                <button
                    onClick={running ? stop : run}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                        running
                            ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                            : "bg-accent text-white hover:opacity-90",
                    )}
                >
                    {running ? <Square size={14} /> : <Play size={14} />}
                    {running ? "Stop" : "Run flow"}
                </button>
                <span className="text-[13px] font-medium text-fg">Login → fetch user</span>
                <span className="hidden text-[12px] text-subtle sm:inline">a 3-step scenario</span>
            </div>

            <div className="grid gap-0 md:grid-cols-[1fr,260px]">
                {/* steps / live timeline */}
                <div className="min-h-[16rem] space-y-2 p-4">
                    {results.length === 0
                        ? SCENARIO.map((line, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-[13px] text-muted">
                                  <span className="mono mt-px text-subtle">{i + 1}.</span>
                                  <span>{line}</span>
                              </div>
                          ))
                        : results.map((r) => {
                              const canOpen = !!r.response;
                              const isOpen = open.has(r.id);
                              return (
                                  <div key={r.id} className="rounded-lg border border-border/70 bg-bg/40">
                                      <button
                                          onClick={() => canOpen && toggle(r.id)}
                                          className={cn(
                                              "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                                              canOpen && "cursor-pointer",
                                          )}
                                          style={{ paddingLeft: r.depth * 16 + 12 }}
                                      >
                                          <StatusIcon status={r.status} />
                                          <span className="text-[13px] font-medium text-fg">{r.title}</span>
                                          {r.response && (
                                              <span className={cn("mono text-[12px]", statusColor(r.response.status))}>
                                                  {r.response.status}
                                              </span>
                                          )}
                                          <span className="ml-auto flex items-center gap-2">
                                              {r.timeMs !== undefined && (
                                                  <span className="mono text-[11px] text-subtle">
                                                      {formatMs(r.timeMs)}
                                                  </span>
                                              )}
                                              {canOpen && (
                                                  <ChevronRight
                                                      size={14}
                                                      className={cn(
                                                          "text-subtle transition-transform",
                                                          isOpen && "rotate-90",
                                                      )}
                                                  />
                                              )}
                                          </span>
                                      </button>
                                      {r.detail && (
                                          <p className="mono px-3 pb-2 text-[12px] text-subtle" style={{ paddingLeft: r.depth * 16 + 38 }}>
                                              {r.detail}
                                          </p>
                                      )}
                                      {isOpen && r.response?.json !== undefined && (
                                          <div className="mono max-h-48 overflow-auto border-t border-border/60 p-3 text-[12.5px]">
                                              <JsonNode
                                                  value={r.response.json}
                                                  path={[]}
                                                  depth={0}
                                                  onContext={(e) => e.preventDefault()}
                                              />
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                </div>

                {/* captured variables */}
                <div className="border-t border-border bg-bg/30 p-4 md:border-l md:border-t-0">
                    <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-subtle">Captured variables</p>
                    {varEntries.length === 0 ? (
                        <p className="text-[13px] text-subtle">Run the flow to capture values from each response.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {varEntries.map(([k, v]) => (
                                <div key={k} className="mono rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px]">
                                    <span className="text-emerald-300">{k}</span>
                                    <span className="text-subtle"> = </span>
                                    <span className="break-all text-fg">{v.length > 40 ? v.slice(0, 40) + "…" : v}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
