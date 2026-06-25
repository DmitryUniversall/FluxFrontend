// An input that (1) highlights {{variable}} / {{$dynamic}} tokens inline, colour-
// coded by the *scope* each one resolves against, and (2) offers a scope-aware
// autocomplete dropdown (parameters + flow-locals + env variables + dynamics) as
// you type "{{". A plain <input> can't render coloured spans, so a synced
// backdrop sits behind a transparent-text input (caret stays visible). The popup
// is portaled to <body> with fixed positioning so it never gets clipped.
//
// Token/colour scheme (see templateScope.ts): env = violet, parameter = gold,
// flow-local = green, dynamic = cyan, unknown = rose.
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DYNAMICS } from "@/core/dynamics";
import { cn } from "../utils/cn";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import {
    classifyToken,
    useTemplateScope,
    VAR_KIND_CHIP,
    VAR_KIND_LABEL,
    VAR_KIND_TEXT,
    type VarKind,
} from "./templateScope";

interface HighlightedInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoFocus?: boolean;
    type?: string;
    wrapperClassName?: string;
    textClassName?: string;
}

interface Token {
    raw: string;
    isVar: boolean;
    name: string;
}

// Charset covers var names ([\w.-]) and dynamic tokens with args ($name:+1h:max).
const TEMPLATE = /(\{\{\s*[\w$.\-:+]+\s*\}\})/g;
const NAME = /\{\{\s*([\w$.\-:+]+)\s*\}\}/;

function tokenize(value: string): Token[] {
    if (!value) return [];
    return value
        .split(TEMPLATE)
        .filter((part) => part !== "")
        .map((part) => {
            const m = part.match(NAME);
            return m ? { raw: part, isVar: true, name: m[1] } : { raw: part, isVar: false, name: "" };
        });
}

let _canvas: HTMLCanvasElement | null = null;
function measure(text: string): number {
    if (typeof document === "undefined") return 0;
    _canvas ??= document.createElement("canvas");
    const ctx = _canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = '13px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
    return ctx.measureText(text).width;
}

interface Item {
    label: string; // text inserted (var key or "$uuid")
    hint: string; // value (var) / description (dynamic) / scope note (flow)
    kind: VarKind;
}

interface Suggest {
    open: boolean;
    items: Item[];
    index: number;
    tokenStart: number;
}

const CLOSED: Suggest = { open: false, items: [], index: 0, tokenStart: -1 };

// Group order in the dropdown (params first - they're the request's own inputs).
const KIND_ORDER: Record<VarKind, number> = { param: 0, flow: 1, env: 2, dynamic: 3, missing: 4 };

export function HighlightedInput({
    value,
    onChange,
    onKeyDown,
    placeholder,
    autoFocus,
    type = "text",
    wrapperClassName,
    textClassName,
}: HighlightedInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [scroll, setScroll] = useState(0);
    const [sug, setSug] = useState<Suggest>(CLOSED);
    const environments = useEnvironments((s) => s.environments);
    const activeId = useEnvironments((s) => s.activeId);
    const scope = useTemplateScope();

    const env = useMemo(() => environments.find((e) => e.id === activeId), [environments, activeId]);

    // ---- scope sets (for classifying tokens) ----
    const envKeys = useMemo(
        () => new Set((env?.variables ?? []).filter((v) => v.enabled && v.key).map((v) => v.key)),
        [env],
    );
    const paramKeys = useMemo(() => new Set(scope.params.map((p) => p.name).filter(Boolean)), [scope.params]);
    const flowKeys = useMemo(() => new Set(scope.flowVars.map((v) => v.name).filter(Boolean)), [scope.flowVars]);
    const sets = useMemo(() => ({ envKeys, paramKeys, flowKeys }), [envKeys, paramKeys, flowKeys]);

    // ---- autocomplete item pools (one per scope) ----
    const paramItems = useMemo<Item[]>(
        () => scope.params.filter((p) => p.name).map((p) => ({ label: p.name, hint: p.hint ?? "", kind: "param" })),
        [scope.params],
    );
    const flowItems = useMemo<Item[]>(
        () =>
            scope.flowVars
                .filter((v) => v.name)
                .map((v) => ({ label: v.name, hint: v.hint ?? "flow variable", kind: "flow" })),
        [scope.flowVars],
    );
    const envItems = useMemo<Item[]>(
        () =>
            (env?.variables ?? [])
                .filter((v) => v.key)
                .map((v) => ({ label: v.key, hint: v.value, kind: "env" as const })),
        [env],
    );
    const dynItems = useMemo<Item[]>(
        () => DYNAMICS.map((d) => ({ label: d.name, hint: d.description + (d.args ?? ""), kind: "dynamic" as const })),
        [],
    );

    const tokens = useMemo(() => tokenize(value), [value]);
    const syncScroll = () => inputRef.current && setScroll(inputRef.current.scrollLeft);

    const recompute = (text: string, caret: number | null) => {
        if (caret == null) return setSug(CLOSED);
        const upto = text.slice(0, caret);
        const open = upto.lastIndexOf("{{");
        if (open === -1) return setSug(CLOSED);
        const between = upto.slice(open + 2);
        if (!/^[\w$.\-:+]*$/.test(between)) return setSug(CLOSED);
        const q = between.toLowerCase();
        const isDyn = q.startsWith("$");

        let pool: Item[];
        if (isDyn) {
            pool = dynItems;
        } else {
            // De-dupe by name across scopes, keeping the highest-precedence kind so a
            // name that is both a param and an env var shows once (as a param).
            const seen = new Set<string>();
            pool = [];
            for (const it of [...paramItems, ...flowItems, ...envItems, ...dynItems]) {
                if (seen.has(it.label)) continue;
                seen.add(it.label);
                pool.push(it);
            }
        }

        const matches = pool.filter((it) => it.label.toLowerCase().includes(q));
        matches.sort((a, b) => {
            const pa = Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q));
            if (pa !== 0) return pa;
            const ko = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
            if (ko !== 0) return ko;
            return a.label.localeCompare(b.label);
        });

        const items = matches.slice(0, 60);
        if (items.length === 0) return setSug(CLOSED);
        setSug({ open: true, items, index: 0, tokenStart: open });
    };

    const accept = (label: string) => {
        const caret = inputRef.current?.selectionStart ?? value.length;
        let after = value.slice(caret);
        // If the caret sits inside an unclosed token (e.g. "{{ba|" inside "{{ba}}"),
        // consume the existing closing "}}" so we don't end up with "{{base}}}}".
        const close = after.match(/^\s*\}\}/);
        if (close) after = after.slice(close[0].length);
        const next = value.slice(0, sug.tokenStart) + `{{${label}}}` + after;
        onChange(next);
        const pos = sug.tokenStart + label.length + 4;
        setSug(CLOSED);
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(pos, pos);
            syncScroll();
        });
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (sug.open) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                return setSug((s) => ({ ...s, index: (s.index + 1) % s.items.length }));
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                return setSug((s) => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length }));
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                return accept(sug.items[sug.index].label);
            }
            if (e.key === "Escape") {
                e.preventDefault();
                return setSug(CLOSED);
            }
        }
        onKeyDown?.(e);
    };

    let pos = { left: 0, top: 0 };
    if (sug.open && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const padLeft = parseFloat(getComputedStyle(inputRef.current).paddingLeft) || 0;
        const left = rect.left + padLeft + measure(value.slice(0, sug.tokenStart)) - scroll;
        pos = { left: Math.min(Math.max(8, left), window.innerWidth - 288), top: rect.bottom + 4 };
    }

    return (
        <div className={cn("relative overflow-hidden", wrapperClassName)}>
            <div
                className={cn("pointer-events-none absolute inset-0 flex items-center overflow-hidden", textClassName)}
                aria-hidden
            >
                <div className="whitespace-pre" style={{ transform: `translateX(${-scroll}px)` }}>
                    {tokens.map((t, i) =>
                        t.isVar ? (
                            <span key={i} className={VAR_KIND_TEXT[classifyToken(t.name, sets)]}>
                                {t.raw}
                            </span>
                        ) : (
                            <span key={i} className="text-fg">
                                {t.raw}
                            </span>
                        ),
                    )}
                </div>
            </div>
            <input
                ref={inputRef}
                type={type}
                value={value}
                placeholder={placeholder}
                autoFocus={autoFocus}
                spellCheck={false}
                onChange={(e) => {
                    onChange(e.target.value);
                    recompute(e.target.value, e.target.selectionStart);
                    requestAnimationFrame(syncScroll);
                }}
                onKeyUp={(e) => recompute(e.currentTarget.value, e.currentTarget.selectionStart)}
                onClick={(e) => recompute(e.currentTarget.value, e.currentTarget.selectionStart)}
                onScroll={syncScroll}
                onKeyDown={onKey}
                onBlur={() => setTimeout(() => setSug(CLOSED), 120)}
                className={cn(
                    "relative h-full w-full bg-transparent outline-none placeholder:text-subtle",
                    textClassName,
                )}
                style={{ color: "transparent", caretColor: "rgb(var(--accent))" }}
            />

            {sug.open &&
                createPortal(
                    <div
                        className="fixed z-[90] max-h-60 w-72 overflow-y-auto rounded-xl border border-border bg-elevated p-1 shadow-2xl"
                        style={{ left: pos.left, top: pos.top }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {sug.items.map((it, i) => (
                            <button
                                key={it.kind + ":" + it.label}
                                onMouseEnter={() => setSug((s) => ({ ...s, index: i }))}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    accept(it.label);
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]",
                                    i === sug.index ? "bg-accent/15" : "",
                                )}
                            >
                                <span className={cn("mono truncate", VAR_KIND_TEXT[it.kind])}>{it.label}</span>
                                <span
                                    className={cn(
                                        "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
                                        VAR_KIND_CHIP[it.kind],
                                    )}
                                >
                                    {VAR_KIND_LABEL[it.kind]}
                                </span>
                                <span className="ml-auto max-w-[110px] truncate text-[11px] text-subtle">
                                    {it.hint}
                                </span>
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
        </div>
    );
}
