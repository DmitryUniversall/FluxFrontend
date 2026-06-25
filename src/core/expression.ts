// JSON expression engine (foundation A). Two modes:
//   * 'path'     - simple dot/bracket path (default; back-compatible)
//   * 'jmespath' - full JMESPath expression
// The value/nomatch distinction matters for asserts (exists) and saveToEnv.
import * as jmespath from "jmespath";
import { getByPath, parsePath } from "./json-path";
import type { Json } from "./types";

export type ExprMode = "path" | "jmespath";

export type EvalResult = { kind: "value"; value: unknown } | { kind: "nomatch" } | { kind: "error"; message: string };

export function evaluate(expr: string, json: unknown, mode: ExprMode): EvalResult {
    if (!expr.trim()) return { kind: "nomatch" };
    if (mode === "jmespath") {
        try {
            const value = jmespath.search(json as object, expr);
            // JMESPath returns null for "not found"; treat that as nomatch.
            return value === null || value === undefined ? { kind: "nomatch" } : { kind: "value", value };
        } catch (e) {
            return { kind: "error", message: e instanceof Error ? e.message : String(e) };
        }
    }
    const value = getByPath(json as Json, parsePath(expr));
    return value === undefined ? { kind: "nomatch" } : { kind: "value", value };
}
