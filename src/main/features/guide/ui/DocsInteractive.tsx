// Interactive, in-page playgrounds embedded in the documentation so readers can
// actually try Flux's signature mechanics - {{template}} resolution with scope-
// coloured highlighting, dynamic variables, and the path/JMESPath expression
// engine. Each widget reuses the REAL core engines (no fakes), so what you see
// here is exactly what runs on send.
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { DYNAMICS, resolveDynamic } from "@/core/dynamics";
import { evaluate, type ExprMode } from "@/core/expression";
import { resolveTemplate } from "@/core/template";
import { classifyToken, VAR_KIND_TEXT } from "@/main/common/ui/templateScope";
import { cn } from "@/main/common/utils/cn";

const TOKEN_SPLIT = /(\{\{\s*[\w$.\-:+]+\s*\}\})/g;
const TOKEN_NAME = /\{\{\s*([\w$.\-:+]+)\s*\}\}/;

// Shared chrome ------------------------------------------------------------------
function Panel({ children }: { children: React.ReactNode }) {
    return <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-3.5">{children}</div>;
}
function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{children}</p>;
}
const fieldCls =
    "mono h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-[13px] text-fg outline-none focus:border-accent";

/** Render text with {{tokens}} coloured by the scope they resolve against. */
function Highlighted({ text, envKeys }: { text: string; envKeys: Set<string> }) {
    const parts = text.split(TOKEN_SPLIT).filter((p) => p !== "");
    return (
        <span className="mono break-all">
            {parts.map((p, i) => {
                const m = p.match(TOKEN_NAME);
                if (!m)
                    return (
                        <span key={i} className="text-fg">
                            {p}
                        </span>
                    );
                const kind = classifyToken(m[1], { envKeys, paramKeys: new Set(), flowKeys: new Set() });
                return (
                    <span key={i} className={VAR_KIND_TEXT[kind]}>
                        {p}
                    </span>
                );
            })}
        </span>
    );
}

// 1 · Template resolution --------------------------------------------------------
export function TemplatePlayground() {
    const [vars, setVars] = useState<Record<string, string>>({
        base_url: "https://api.example.com",
        userId: "u_42",
    });
    const [tpl, setTpl] = useState("{{base_url}}/users/{{userId}}?trace={{$uuid}}");
    const [nonce, setNonce] = useState(0);

    const envKeys = useMemo(() => new Set(Object.keys(vars)), [vars]);
    // nonce in deps so "Resolve again" re-rolls the {{$uuid}} dynamic.
    const resolved = useMemo(() => resolveTemplate(tpl, (n) => vars[n]), [tpl, vars, nonce]);

    return (
        <Panel>
            <div>
                <Caption>Environment variables (editable)</Caption>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {Object.entries(vars).map(([k, v]) => (
                        <label key={k} className="flex items-center gap-1.5">
                            <span className="mono shrink-0 text-[12px] text-accent">{k}</span>
                            <input
                                className={fieldCls}
                                value={v}
                                onChange={(e) => setVars((s) => ({ ...s, [k]: e.target.value }))}
                            />
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <Caption>
                    Template, try editing it (e.g. add {"{{missing}}"} or {"{{$timestamp}}"})
                </Caption>
                <input className={cn(fieldCls, "mt-1.5")} value={tpl} onChange={(e) => setTpl(e.target.value)} />
                <div className="mt-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px] leading-relaxed">
                    <Highlighted text={tpl} envKeys={envKeys} />
                </div>
            </div>

            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <Caption>Resolved at send time</Caption>
                    <p className="mono mt-1 break-all text-[13px] text-emerald-300">{resolved}</p>
                </div>
                <button
                    onClick={() => setNonce((n) => n + 1)}
                    className="mt-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12px] text-muted hover:text-fg"
                >
                    <RefreshCw size={12} /> Resolve again
                </button>
            </div>
            <p className="text-[12px] leading-relaxed text-subtle">
                Violet tokens resolve from the active environment; cyan ones are dynamic and regenerate every send; rose
                means the name isn't defined anywhere (a likely typo).
            </p>
        </Panel>
    );
}

// 2 · Dynamic variables ----------------------------------------------------------
function rollAll(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of DYNAMICS) out[d.name] = resolveDynamic(d.name) ?? "";
    return out;
}

export function DynamicsPlayground() {
    const [vals, setVals] = useState<Record<string, string>>(rollAll);

    return (
        <Panel>
            <div className="flex items-center justify-between">
                <Caption>Click any value to generate a fresh one</Caption>
                <button
                    onClick={() => setVals(rollAll())}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2.5 py-1 text-[12px] text-muted hover:text-fg"
                >
                    <RefreshCw size={12} /> Roll all
                </button>
            </div>
            <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                {DYNAMICS.map((d) => (
                    <button
                        key={d.name}
                        onClick={() => setVals((s) => ({ ...s, [d.name]: resolveDynamic(d.name) ?? "" }))}
                        title="Click to regenerate"
                        className="flex w-full items-center gap-3 bg-bg px-2.5 py-1.5 text-left hover:bg-elevated"
                    >
                        <span className="mono w-44 shrink-0 text-[12.5px] text-cyan-300">
                            {`{{${d.name}${d.args ?? ""}}}`}
                        </span>
                        <span className="mono min-w-0 flex-1 truncate text-[12.5px] text-fg">{vals[d.name]}</span>
                        <RefreshCw size={11} className="shrink-0 text-subtle" />
                    </button>
                ))}
            </div>
            <p className="text-[12px] leading-relaxed text-subtle">
                Each occurrence resolves independently, so two {"{{$uuid}}"} in one request get different values. Pass
                arguments after a colon, e.g. {"{{$randomInt:1:100}}"} or {"{{$datetime:+1h}}"}.
            </p>
        </Panel>
    );
}

// 3 · Expression engine (path / JMESPath) ----------------------------------------
const SAMPLE = {
    data: {
        total: 2,
        items: [
            { id: "u_1", name: "Ada", active: true, tags: ["admin", "beta"] },
            { id: "u_2", name: "Linus", active: false, tags: ["beta"] },
        ],
    },
};

const EXAMPLES: Record<ExprMode, string[]> = {
    path: ["data.items[0].name", "data.total", "data.items[1].tags[0]"],
    jmespath: ["data.items[?active].name", "length(data.items)", "data.items[].id"],
};

export function ExpressionPlayground() {
    const [mode, setMode] = useState<ExprMode>("path");
    const [expr, setExpr] = useState("data.items[0].name");
    const result = useMemo(() => evaluate(expr, SAMPLE, mode), [expr, mode]);

    return (
        <Panel>
            <div>
                <Caption>Sample response</Caption>
                <pre className="mono mt-1.5 overflow-x-auto rounded-lg border border-border bg-bg p-2.5 text-[12px] leading-relaxed text-fg">
                    {JSON.stringify(SAMPLE, null, 2)}
                </pre>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-bg p-0.5">
                    {(["path", "jmespath"] as ExprMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                setMode(m);
                                setExpr(EXAMPLES[m][0]);
                            }}
                            className={cn(
                                "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                                mode === m ? "bg-accent text-white" : "text-muted hover:text-fg",
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <input className={cn(fieldCls, "flex-1")} value={expr} onChange={(e) => setExpr(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-1.5">
                {EXAMPLES[mode].map((ex) => (
                    <button
                        key={ex}
                        onClick={() => setExpr(ex)}
                        className="mono rounded-md border border-border bg-bg px-2 py-0.5 text-[11.5px] text-muted hover:text-fg"
                    >
                        {ex}
                    </button>
                ))}
            </div>

            <div>
                <Caption>Result</Caption>
                <div className="mono mt-1 break-all rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px]">
                    {result.kind === "value" && (
                        <span className="text-emerald-300">{JSON.stringify(result.value)}</span>
                    )}
                    {result.kind === "nomatch" && <span className="text-subtle">no match</span>}
                    {result.kind === "error" && <span className="text-rose-400">{result.message}</span>}
                </div>
            </div>
            <p className="text-[12px] leading-relaxed text-subtle">
                This is the same engine behind <span className="text-fg">Save to environment</span>, flow captures and
                JSON-value asserts. <span className="text-fg">path</span> is a simple dot/bracket path;{" "}
                <span className="text-fg">jmespath</span> adds filters, functions and projections.
            </p>
        </Panel>
    );
}

export function DocDemo({ kind }: { kind: "template" | "dynamics" | "expression" }) {
    if (kind === "template") return <TemplatePlayground />;
    if (kind === "dynamics") return <DynamicsPlayground />;
    return <ExpressionPlayground />;
}
