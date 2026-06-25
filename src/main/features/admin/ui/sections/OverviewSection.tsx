// Overview: system info, instance counts and app-level request metrics.
import { Activity, LayoutDashboard, Server } from "lucide-react";
import { cn } from "@/main/common/utils/cn";
import type { Counts, Overview } from "../../domain/models";
import { Sparkline } from "../Sparkline";
import { formatNumber, formatUptime, SectionTitle, Stat } from "../parts";

const COUNT_FIELDS: [keyof Counts, string][] = [
    ["users", "Users"],
    ["roles", "Roles"],
    ["workspaces", "Workspaces"],
    ["collections", "Collections"],
    ["requests", "Requests"],
    ["environments", "Environments"],
    ["identities", "Identities"],
    ["invitations", "Invitations"],
];

export function OverviewSection({ overview, requests }: { overview: Overview; requests: number[] }) {
    const { system, counts, metrics } = overview;
    return (
        <div className="space-y-7">
            <section>
                <SectionTitle icon={Server} title="System" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Version" value={system.version} />
                    <Stat label="Storage" value={system.storage_backend.toUpperCase()} />
                    <Stat label="Redis" value={system.redis_enabled ? "Enabled" : "Off"} />
                    <Stat label="Uptime" value={formatUptime(system.uptime_seconds)} />
                </div>
            </section>

            <section>
                <SectionTitle icon={Activity} title="Load" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Requests/s (1m)" value={metrics.rps_1m.toFixed(2)} />
                    <Stat label="Total requests" value={formatNumber(metrics.total_requests)} />
                    <Stat label="Latency p50 / p95" value={`${metrics.p50_ms} / ${metrics.p95_ms} ms`} />
                    <Stat label="Error rate" value={`${(metrics.error_rate * 100).toFixed(1)}%`} />
                </div>
                <div className="mt-3 rounded-xl border border-border bg-surface p-4">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-subtle">
                        Requests per minute (last hour)
                    </p>
                    <Sparkline values={requests} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(metrics.status_classes).map(([klass, n]) => (
                        <span
                            key={klass}
                            className={cn(
                                "rounded-md px-2 py-0.5 text-[11.5px] font-medium",
                                klass === "2xx" && "bg-emerald-500/15 text-emerald-400",
                                klass === "3xx" && "bg-sky-500/15 text-sky-400",
                                klass === "4xx" && "bg-amber-500/15 text-amber-400",
                                klass === "5xx" && "bg-red-500/15 text-red-400",
                            )}
                        >
                            {klass} {formatNumber(n)}
                        </span>
                    ))}
                </div>
            </section>

            <section>
                <SectionTitle icon={LayoutDashboard} title="Data" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {COUNT_FIELDS.map(([key, label]) => (
                        <Stat key={key} label={label} value={formatNumber(counts[key])} />
                    ))}
                </div>
            </section>

            {metrics.top_routes.length > 0 && (
                <section>
                    <SectionTitle icon={Activity} title="Top routes" />
                    <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full text-[12.5px]">
                            <thead className="bg-elevated text-subtle">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">Route</th>
                                    <th className="px-3 py-2 text-right font-medium">Calls</th>
                                    <th className="px-3 py-2 text-right font-medium">Errors</th>
                                    <th className="px-3 py-2 text-right font-medium">Avg ms</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.top_routes.map((r, i) => (
                                    <tr key={`${r.method}-${r.path}-${i}`} className="border-t border-border">
                                        <td className="px-3 py-1.5 font-mono text-[11.5px] text-muted">
                                            <span className="text-accent">{r.method}</span> {r.path}
                                        </td>
                                        <td className="px-3 py-1.5 text-right text-fg">{formatNumber(r.count)}</td>
                                        <td className="px-3 py-1.5 text-right text-muted">{formatNumber(r.errors)}</td>
                                        <td className="px-3 py-1.5 text-right text-muted">{r.avg_ms}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
