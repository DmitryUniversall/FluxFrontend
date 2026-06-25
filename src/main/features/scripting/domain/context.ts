// Execution context shared by the block engine and the code runner. One shape
// for pre-request (no response) and post-response runs.
//
// Variable resolution order (highest first): temp-override scopes (innermost
// first) -> environment snapshot. (Invocation/flow scopes plug in here later.)
import { getByPath, parsePath } from "@/core/json-path";
import type { Json } from "@/core/types";
import type { Lookup } from "@/core/template";
import type { AuthOverride } from "./blocks";

export interface ResponseView {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    json: Json | undefined;
    timeMs: number;
    sizeBytes: number;
}

export interface EnvMutation {
    key: string;
    value: string;
    envId: string | null;
}

export interface AssertResult {
    label: string;
    passed: boolean;
    detail: string;
}

export interface EngineContext {
    phase: "pre" | "post";
    response: ResponseView | null;
    /** Active env values; updated as setEnv runs. */
    snapshot: Map<string, string>;
    /** Temp-override scope stack (innermost last). */
    scopes: Map<string, string>[];
    activeEnvId: string | null;
    mutations: EnvMutation[];
    logs: string[];
    testResults: AssertResult[];
    authOverride: AuthOverride | null;
}

export function makeContext(
    phase: "pre" | "post",
    response: ResponseView | null,
    snapshot: Map<string, string>,
    activeEnvId: string | null,
): EngineContext {
    return {
        phase,
        response,
        snapshot,
        scopes: [],
        activeEnvId,
        mutations: [],
        logs: [],
        testResults: [],
        authOverride: null,
    };
}

export function pushScope(ctx: EngineContext, frame: Map<string, string>): void {
    ctx.scopes.push(frame);
}
export function popScope(ctx: EngineContext): void {
    ctx.scopes.pop();
}

/** Persist an environment write (and reflect it in the working snapshot). */
export function setEnv(ctx: EngineContext, key: string, value: string, envId: string | null): void {
    if (!key) return;
    const target = envId ?? ctx.activeEnvId;
    ctx.mutations.push({ key, value, envId: target });
    if (target === ctx.activeEnvId) ctx.snapshot.set(key, value);
}

/** Read a variable honouring the scope chain, then the environment. */
export function getEnv(ctx: EngineContext, key: string): string | undefined {
    for (let i = ctx.scopes.length - 1; i >= 0; i--) {
        const frame = ctx.scopes[i];
        if (frame.has(key)) return frame.get(key);
    }
    return ctx.snapshot.get(key);
}

/** Lookup function for the template resolver (scopes -> environment). */
export function lookup(ctx: EngineContext): Lookup {
    return (name) => getEnv(ctx, name);
}

export function headerValue(ctx: EngineContext, name: string): string | undefined {
    if (!ctx.response) return undefined;
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(ctx.response.headers)) if (k.toLowerCase() === lower) return v;
    return undefined;
}

/** Read a value from the response body by a dotted/bracket path string. */
export function bodyValue(ctx: EngineContext, path: string): Json | undefined {
    if (!ctx.response || ctx.response.json === undefined) return undefined;
    return getByPath(ctx.response.json, parsePath(path));
}
