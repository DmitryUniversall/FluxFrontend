// Template scope: the extra, context-dependent variables a {{template}} field
// can reference beyond the active environment. The request editor contributes
// the request's *declared parameters* (its Inputs); the flow editor contributes
// the *flow-scope locals* (set / input / capture / forEach vars). HighlightedInput
// reads this context to colour each token by where it comes from and to surface
// every scope (not just env) in autocomplete.
//
// Resolution precedence mirrors the runtime: dynamics ($) -> parameters ->
// flow-locals -> environment -> (otherwise) unknown.
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type VarKind = "dynamic" | "param" | "flow" | "env" | "missing";

export interface ScopeVar {
    name: string;
    // Shown as the secondary hint in autocomplete (a value for env/params, a short
    // note for flow-locals). Optional.
    hint?: string;
}

export interface TemplateScope {
    params: ScopeVar[];
    flowVars: ScopeVar[];
}

const EMPTY: TemplateScope = { params: [], flowVars: [] };

const TemplateScopeContext = createContext<TemplateScope>(EMPTY);

export function TemplateScopeProvider({
    params,
    flowVars,
    children,
}: {
    params?: ScopeVar[];
    flowVars?: ScopeVar[];
    children: ReactNode;
}) {
    const value = useMemo<TemplateScope>(
        () => ({ params: params ?? [], flowVars: flowVars ?? [] }),
        [params, flowVars],
    );
    return <TemplateScopeContext.Provider value={value}>{children}</TemplateScopeContext.Provider>;
}

export function useTemplateScope(): TemplateScope {
    return useContext(TemplateScopeContext);
}

// Per-kind text colour for highlighted tokens and autocomplete labels. Chosen to
// be maximally distinct on the dark surface: violet (env, the app accent), gold
// (params - values you supply), green (flow-locals - live only during a run),
// cyan (dynamics - generated at send time) and rose (unknown - likely a typo or
// an undefined variable).
export const VAR_KIND_TEXT: Record<VarKind, string> = {
    env: "text-accent",
    param: "text-amber-300",
    flow: "text-emerald-300",
    dynamic: "text-cyan-300",
    missing: "text-rose-400",
};

// A faint background chip used for the little kind tag in the dropdown.
export const VAR_KIND_CHIP: Record<VarKind, string> = {
    env: "bg-accent/15 text-accent",
    param: "bg-amber-300/15 text-amber-300",
    flow: "bg-emerald-300/15 text-emerald-300",
    dynamic: "bg-cyan-300/15 text-cyan-300",
    missing: "bg-rose-400/15 text-rose-300",
};

export const VAR_KIND_LABEL: Record<VarKind, string> = {
    env: "env",
    param: "param",
    flow: "flow",
    dynamic: "dynamic",
    missing: "unknown",
};

export interface ClassifySets {
    envKeys: Set<string>;
    paramKeys: Set<string>;
    flowKeys: Set<string>;
}

/** Classify a {{name}} (without the braces) into the scope that owns it. */
export function classifyToken(name: string, sets: ClassifySets): VarKind {
    if (name.startsWith("$")) return "dynamic";
    if (sets.paramKeys.has(name)) return "param";
    if (sets.flowKeys.has(name)) return "flow";
    if (sets.envKeys.has(name)) return "env";
    return "missing";
}
