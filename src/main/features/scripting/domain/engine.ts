// The scripting engine: evaluates the visual blocks (then code) against a shared
// context. One engine for pre-request and post-response. Any block tree has a
// deterministic meaning that mirrors the Code path.
import { evaluate } from "@/core/expression";
import { valueToString } from "@/core/json-path";
import { resolveTemplate } from "@/core/template";
import type { Json } from "@/core/types";
import type { AssertBlock, AssertOp, Block, ConditionBlock, ConditionOp } from "./blocks";
import {
    getEnv,
    headerValue,
    lookup,
    popScope,
    pushScope,
    setEnv,
    type AssertResult,
    type EngineContext,
} from "./context";
import { runCode } from "./code-runner";

function resolve(text: string, ctx: EngineContext): string {
    return resolveTemplate(text, lookup(ctx));
}

// ---- conditions ----
function leftFor(block: ConditionBlock, ctx: EngineContext): unknown {
    switch (block.source) {
        case "status":
            return ctx.response?.status;
        case "body": {
            if (!ctx.response) return undefined;
            const r = evaluate(block.path, ctx.response.json, block.mode ?? "path");
            return r.kind === "value" ? r.value : undefined;
        }
        case "header":
            return headerValue(ctx, block.path);
        case "env":
            return getEnv(ctx, block.path);
    }
}

function compare(left: unknown, op: ConditionOp, right: string): boolean {
    if (op === "exists") return left !== undefined && left !== null;
    if (left === undefined || left === null) return false;
    const ls = typeof left === "object" ? JSON.stringify(left) : String(left);
    switch (op) {
        case "eq":
            return ls === right || Number(left) === Number(right);
        case "neq":
            return !(ls === right || Number(left) === Number(right));
        case "gt":
            return Number(left) > Number(right);
        case "lt":
            return Number(left) < Number(right);
        case "contains":
            return ls.includes(right);
    }
}

export function evalCondition(block: ConditionBlock, ctx: EngineContext): boolean {
    return compare(leftFor(block, ctx), block.operator, block.value);
}

// ---- asserts ----
function assertCompare(actual: unknown, op: AssertOp, expected: string): boolean {
    if (op === "exists") return actual !== undefined && actual !== null;
    if (actual === undefined || actual === null) return false;
    const as = typeof actual === "object" ? JSON.stringify(actual) : String(actual);
    switch (op) {
        case "eq":
            return as === expected || Number(actual) === Number(expected);
        case "neq":
            return !(as === expected || Number(actual) === Number(expected));
        case "lt":
            return Number(actual) < Number(expected);
        case "gt":
            return Number(actual) > Number(expected);
        case "contains":
            return as.includes(expected);
        case "regex":
            try {
                return new RegExp(expected).test(as);
            } catch {
                return false;
            }
        case "isType":
            return (Array.isArray(actual) ? "array" : typeof actual) === expected;
    }
}

function statusMatches(actual: number, value: string): boolean {
    const v = value.trim();
    if (/^[1-5]xx$/i.test(v)) return Math.floor(actual / 100) === Number(v[0]);
    if (v.includes(","))
        return v
            .split(",")
            .map((s) => s.trim())
            .includes(String(actual));
    return actual === Number(v);
}

export function runAssert(block: AssertBlock, ctx: EngineContext): AssertResult {
    const res = ctx.response;
    let passed = false;
    let actualStr = "";
    if (!res) {
        return { label: block.label || labelFor(block), passed: false, detail: "no response" };
    }
    switch (block.kind) {
        case "status":
            actualStr = String(res.status);
            passed = statusMatches(res.status, block.value);
            break;
        case "time":
            actualStr = `${res.timeMs}ms`;
            passed = res.timeMs < Number(block.value);
            break;
        case "json": {
            const r = evaluate(block.expr, res.json, block.mode ?? "path");
            const actual = r.kind === "value" ? r.value : undefined;
            actualStr = r.kind === "error" ? `error: ${r.message}` : valueToString(actual as Json);
            passed = r.kind === "error" ? false : assertCompare(actual, block.op, block.value);
            break;
        }
        case "header": {
            const hv = headerValue(ctx, block.expr);
            actualStr = hv ?? "(absent)";
            passed = assertCompare(hv, block.op, block.value);
            break;
        }
        case "body": {
            const body = res.body ?? "";
            if (block.op === "regex") passed = safeRegex(block.value, body);
            else if (block.value === "__isJson") passed = isJson(body);
            else if (block.op === "eq") passed = jsonEquals(body, block.value);
            else passed = body.includes(block.value);
            actualStr = `${body.length} bytes`;
            break;
        }
    }
    const detail = passed ? "" : `${labelFor(block)} - got ${truncate(actualStr)}`;
    return { label: block.label || labelFor(block), passed, detail };
}

function labelFor(b: AssertBlock): string {
    switch (b.kind) {
        case "status":
            return `status is ${b.value}`;
        case "time":
            return `time < ${b.value}ms`;
        case "json":
            return `${b.expr || "$"} ${b.op} ${b.value}`;
        case "header":
            return `header ${b.expr} ${b.op} ${b.value}`;
        case "body":
            return `body ${b.op} ${truncate(b.value)}`;
    }
}

const safeRegex = (pat: string, s: string) => {
    try {
        return new RegExp(pat).test(s);
    } catch {
        return false;
    }
};
const isJson = (s: string) => {
    try {
        JSON.parse(s);
        return true;
    } catch {
        return false;
    }
};
const jsonEquals = (a: string, b: string) => {
    try {
        return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
    } catch {
        return false;
    }
};

// ---- block runner ----
export function runBlocks(blocks: Block[], ctx: EngineContext): void {
    for (const block of blocks) {
        switch (block.type) {
            case "condition":
                if (evalCondition(block, ctx)) runBlocks(block.children, ctx);
                break;
            case "withVars": {
                const frame = new Map<string, string>();
                for (const o of block.overrides) if (o.name) frame.set(o.name, resolve(o.value, ctx));
                pushScope(ctx, frame);
                try {
                    runBlocks(block.children, ctx);
                } finally {
                    popScope(ctx);
                }
                break;
            }
            case "setAuth":
                ctx.authOverride = { ...block.auth };
                ctx.logs.push(`-> auth = ${block.auth.type}`);
                break;
            case "assert": {
                const result = runAssert(block, ctx);
                ctx.testResults.push(result);
                ctx.logs.push(`${result.passed ? "✓" : "✕"} ${result.label}`);
                break;
            }
            case "saveToEnv": {
                if (!ctx.response || ctx.response.json === undefined) {
                    ctx.logs.push(`⚠ "${block.variable || block.displayPath}" skipped: no JSON body`);
                    break;
                }
                const r = evaluate(block.displayPath, ctx.response.json, block.mode ?? "path");
                if (r.kind === "value") {
                    const value = valueToString(r.value as Json);
                    setEnv(ctx, block.variable, value, block.envId);
                    ctx.logs.push(`-> ${block.variable} = ${truncate(value)}`);
                } else if (r.kind === "nomatch") {
                    ctx.logs.push(`⚠ ${block.variable}: no match for "${block.displayPath}" - left unchanged`);
                } else {
                    ctx.logs.push(`✕ ${block.variable}: ${r.message}`);
                }
                break;
            }
            case "setEnv": {
                const value = resolve(block.value, ctx);
                setEnv(ctx, block.variable, value, block.envId);
                ctx.logs.push(`-> ${block.variable} = ${truncate(value)}`);
                break;
            }
            case "log":
                ctx.logs.push(resolve(block.message, ctx));
                break;
        }
    }
}

function truncate(s: string): string {
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

/** Run one stage: visual blocks first, then hand-written code. */
export function runStage(stage: { blocks: Block[]; code: string }, ctx: EngineContext): void {
    if (stage.blocks?.length) runBlocks(stage.blocks, ctx);
    if (stage.code) runCode(stage.code, ctx);
}
