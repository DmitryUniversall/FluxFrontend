// Client-side flow runner. Walks the step tree (depth-first, with nesting for
// forEach/if) against an isolated flow-scope that only lives during the run.
// Reuses the request builder, substitution layer, expression engine and assert
// engine - so a flow behaves exactly like running its requests by hand.
//
// Resolution order for a Call/Poll: invocation args -> flow-scope -> environment.
// setAuth sets the current auth applied to every subsequent Call until changed.
import { evaluate } from "@/core/expression";
import { valueToString } from "@/core/json-path";
import { resolveTemplate } from "@/core/template";
import type { Json } from "@/core/types";
import type { Environment } from "@/main/features/environments/domain/models";
import { isAllowedSelectedValue, variantOptions } from "@/main/features/environments/domain/use-cases";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type { RequestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type {
    AssertStep,
    Auth,
    CallStep,
    Capture,
    FlowStep,
    HttpRequest,
    OutgoingRequest,
    WaitStep,
} from "@/main/features/request-editor/domain/models";
import { buildOutgoing, buildResponseView } from "@/main/features/request-editor/domain/use-cases";
import type { AssertBlock, AssertKind, AssertOp, ExprMode } from "@/main/features/scripting/domain/blocks";
import { EnvMutation, makeContext, type ResponseView } from "@/main/features/scripting/domain/context";
import { runAssert } from "@/main/features/scripting/domain/engine";

export type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface StepResult {
    id: string; // unique per execution (stepId#seq) - loops produce many
    type: FlowStep["type"];
    title: string;
    status: StepStatus;
    depth: number;
    timeMs?: number;
    detail?: string;
    request?: OutgoingRequest;
    response?: ResponseView;
}

export interface RunUpdate {
    results: StepResult[];
    vars: Record<string, string>;
}

// A pause point: the runner asks the host UI for a value and waits. Resolving
// with a string continues the flow; `null` means the user cancelled.
export interface InputRequest {
    prompt: string;
    variable: string;
    secret: boolean;
    defaultValue: string;
}
export type InputProvider = (req: InputRequest) => Promise<string | null>;

interface Exec {
    scope: Map<string, string>;
    envSnap: Map<string, string>;
    env: Environment | null;
    mutations: EnvMutation[];
    auth: Auth | null;
    last: ResponseView | null;
    results: StepResult[];
    stopped: boolean;
    seq: number;
    isCancelled: () => boolean;
    requestInput: InputProvider | null;
    resolveAuth: (a: Auth) => Auth;
    repo: RequestsRepository;
    emit: () => void;
}

// A step failure that still carries the request/response it produced (e.g. the
// HTTP call succeeded but a capture couldn't resolve), so the UI can show the
// exchange in full - just in red - instead of only an error message.
class StepFailure extends Error {
    constructor(
        message: string,
        readonly outgoing?: OutgoingRequest,
        readonly response?: ResponseView,
    ) {
        super(message);
        this.name = "StepFailure";
    }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const trunc = (s: string) => (s.length > 50 ? s.slice(0, 50) + "…" : s);
const lookupOf = (scope: Map<string, string>, env: Map<string, string>) => (n: string) =>
    scope.has(n) ? scope.get(n) : env.get(n);

function titleOf(s: FlowStep): string {
    switch (s.type) {
        case "call":
            return "Call …";
        case "set":
            return `Set ${s.variable || "?"}`;
        case "setEnv":
            return `Set env ${s.variable || "?"}`;
        case "input":
            return `Ask ${s.variable || "input"}`;
        case "delay":
            return `Delay ${s.ms}ms`;
        case "setAuth":
            return `Set auth (${s.auth.type})`;
        case "assert":
            return `Assert ${s.kind}`;
        case "wait":
            return "Poll …";
        case "forEach":
            return `For each ${s.itemVar || "item"} in ${s.expr || "…"}`;
        case "if":
            return `If ${s.expr || s.kind}`;
    }
}

export async function runFlow(
    steps: FlowStep[],
    env: Environment | null,
    onUpdate: (u: RunUpdate) => void,
    isCancelled: () => boolean,
    applyMutations: (mutations: EnvMutation[]) => Promise<void> = async () => {},
    requestInput: InputProvider | null = null,
    resolveAuth: (a: Auth) => Auth = (a) => a,
    // The data layer for Call/Poll steps. Defaults to the app's authenticated
    // repository; the landing demos inject a public, preview-proxy-backed one.
    repo: RequestsRepository = requestsRepository,
): Promise<void> {
    const envSnap = new Map<string, string>();
    if (env) for (const v of env.variables) if (v.enabled && v.key) envSnap.set(v.key, v.value);
    const scope = new Map<string, string>();
    const ex: Exec = {
        scope,
        envSnap,
        env,
        mutations: [],
        auth: null,
        last: null,
        results: [],
        stopped: false,
        seq: 0,
        isCancelled,
        requestInput,
        resolveAuth,
        repo,
        emit: () => {},
    };
    ex.emit = () => onUpdate({ results: ex.results.map((r) => ({ ...r })), vars: Object.fromEntries(scope) });
    ex.emit();
    await runSteps(steps, 0, ex);
    if (ex.mutations.length) await applyMutations(ex.mutations);
}

async function runSteps(steps: FlowStep[], depth: number, ex: Exec): Promise<void> {
    const resolve = (text: string) => resolveTemplate(text, lookupOf(ex.scope, ex.envSnap));

    for (const step of steps) {
        if (ex.stopped) break;
        const rid = `${step.id}#${ex.seq++}`;
        if (ex.isCancelled()) {
            ex.results.push({ id: rid, type: step.type, title: titleOf(step), status: "skipped", depth });
            ex.emit();
            continue;
        }
        const result: StepResult = { id: rid, type: step.type, title: titleOf(step), status: "running", depth };
        ex.results.push(result);
        ex.emit();
        const t0 = performance.now();

        try {
            if (step.type === "set") {
                ex.scope.set(step.variable, resolve(step.value));
                result.status = "passed";
                result.detail = `${step.variable} = ${trunc(ex.scope.get(step.variable) ?? "")}`;
            } else if (step.type === "setEnv") {
                const key = step.variable.trim();
                if (!key) throw new Error("Variable name is required");
                const value = resolve(step.value);
                const targetEnvId = step.envId ?? ex.env?.id ?? null;
                if (!targetEnvId) throw new Error("No environment selected");
                // Enforce the selectable constraint for the active env (the one we hold
                // here). The resolved value matters - a {{template}} can land off-list.
                if (targetEnvId === ex.env?.id && ex.env) {
                    const existing = ex.env.variables.find((v) => v.key === key);
                    if (!isAllowedSelectedValue(existing, value)) {
                        throw new Error(
                            `"${key}" is a selectable variable - it only accepts: ${variantOptions(existing).join(", ")} (got "${trunc(value)}")`,
                        );
                    }
                }
                ex.mutations.push({ key, value, envId: targetEnvId });
                if (targetEnvId === ex.env?.id) ex.envSnap.set(key, value);
                result.status = "passed";
                result.detail = `${key} = ${trunc(value)}`;
            } else if (step.type === "input") {
                if (!step.variable.trim()) throw new Error("Input step needs a variable name");
                if (!ex.requestInput) throw new Error("This run can't prompt for input");
                const entered = await ex.requestInput({
                    prompt: step.prompt || `Enter ${step.variable}`,
                    variable: step.variable,
                    secret: !!step.secret,
                    defaultValue: resolve(step.defaultValue || ""),
                });
                if (entered === null) {
                    result.status = "skipped";
                    result.detail = "cancelled by user";
                    ex.stopped = true;
                } else {
                    ex.scope.set(step.variable, entered);
                    result.status = "passed";
                    result.detail = `${step.variable} = ${step.secret ? "•••" : trunc(entered)}`;
                }
            } else if (step.type === "delay") {
                await sleep(Math.max(0, step.ms || 0));
                result.status = "passed";
            } else if (step.type === "setAuth") {
                ex.auth = { ...step.auth } as Auth;
                result.status = "passed";
                result.detail = `auth = ${step.auth.type}`;
            } else if (step.type === "call") {
                const r = await runCall(step, ex.envSnap, ex.scope, ex.auth, ex.resolveAuth, ex.repo);
                ex.last = r.response;
                result.title = `Call ${r.name}`;
                result.request = r.outgoing;
                result.response = r.response;
                result.detail = `${r.response.status} ${r.response.statusText} · captured: ${r.captured.join(", ") || "-"}`;
                result.status = r.response.status >= 200 && r.response.status < 400 ? "passed" : "failed";
            } else if (step.type === "assert") {
                const res = runAssertStep(step, ex.last, ex.scope, ex.envSnap, ex.env);
                result.status = res.passed ? "passed" : "failed";
                result.detail = res.detail || (res.passed ? "ok" : "failed");
                if (!res.passed && step.onFail === "stop") ex.stopped = true;
            } else if (step.type === "wait") {
                const r = await runPoll(
                    step,
                    ex.envSnap,
                    ex.scope,
                    ex.auth,
                    ex.env,
                    ex.isCancelled,
                    ex.resolveAuth,
                    ex.repo,
                    (a) => {
                        result.detail = `attempt ${a}…`;
                        ex.emit();
                    },
                );
                ex.last = r.response ?? ex.last;
                result.title = `Poll ${r.name}`;
                result.request = r.outgoing;
                result.response = r.response;
                result.detail = `${r.attempts} attempt(s) · ${r.met ? "condition met" : "timed out"}`;
                result.status = r.met ? "passed" : "failed";
                if (!r.met && step.onFail === "stop") ex.stopped = true;
            } else if (step.type === "forEach") {
                const r = evaluate(step.expr, ex.last?.json, step.mode);
                const arr = r.kind === "value" && Array.isArray(r.value) ? (r.value as unknown[]) : [];
                result.status = "passed";
                result.detail =
                    r.kind === "value" && Array.isArray(r.value) ? `${arr.length} item(s)` : "no array (0 items)";
                result.timeMs = Math.round(performance.now() - t0);
                ex.emit();
                for (let idx = 0; idx < arr.length; idx++) {
                    if (ex.stopped || ex.isCancelled()) break;
                    ex.scope.set(step.itemVar || "item", valueToString(arr[idx] as Json));
                    if (step.indexVar) ex.scope.set(step.indexVar, String(idx));
                    await runSteps(step.children, depth + 1, ex);
                }
                continue;
            } else if (step.type === "if") {
                const ok = evalAssert(
                    { id: step.id, kind: step.kind, expr: step.expr, mode: step.mode, op: step.op, value: step.value },
                    ex.last,
                    ex.scope,
                    ex.envSnap,
                    ex.env,
                ).passed;
                result.status = "passed";
                result.detail = ok ? "true -> run" : "false -> skip";
                result.timeMs = Math.round(performance.now() - t0);
                ex.emit();
                if (ok) await runSteps(step.children, depth + 1, ex);
                continue;
            }
        } catch (e) {
            result.status = "failed";
            result.detail = e instanceof Error ? e.message : String(e);
            // Surface the request/response behind the failure so it's inspectable.
            if (e instanceof StepFailure) {
                if (e.outgoing) result.request = e.outgoing;
                if (e.response) result.response = e.response;
            }
            ex.stopped = true;
        }
        result.timeMs = Math.round(performance.now() - t0);
        ex.emit();
    }
}

// A declared `required` parameter must end up with a non-empty value - from an
// invocation arg, the flow-scope, or the environment. Returns the names that
// won't, so a Call/Poll can fail fast with a clear message instead of silently
// sending a half-filled request.
function unmetRequiredParams(
    target: HttpRequest,
    argMap: Map<string, string>,
    scope: Map<string, string>,
    envSnap: Map<string, string>,
): string[] {
    const missing: string[] = [];
    for (const p of target.parameters ?? []) {
        if (!p.required || !p.name) continue;
        const v = argMap.get(p.name) ?? (scope.has(p.name) ? scope.get(p.name) : envSnap.get(p.name));
        if (v === undefined || v === "") missing.push(p.name);
    }
    return missing;
}

async function runCall(
    step: CallStep,
    envSnap: Map<string, string>,
    scope: Map<string, string>,
    auth: Auth | null,
    resolveAuth: (a: Auth) => Auth,
    repo: RequestsRepository,
) {
    if (!step.requestId) throw new Error("No target request selected for this Call step");
    let target;
    try {
        target = await repo.get(step.requestId);
    } catch {
        throw new Error("Target request not found (it may have been deleted)");
    }
    const argMap = new Map<string, string>();
    for (const a of step.args) if (a.name) argMap.set(a.name, resolveTemplate(a.value, lookupOf(scope, envSnap)));
    const missing = unmetRequiredParams(target, argMap, scope, envSnap);
    if (missing.length) throw new Error(`Missing required parameter(s): ${missing.join(", ")}`);
    const resolver = (text: string) =>
        resolveTemplate(text, (n) => (argMap.has(n) ? argMap.get(n) : scope.has(n) ? scope.get(n) : envSnap.get(n)));
    // Precedence: this call's own override -> the active Set-auth -> the request's
    // own auth. (An explicit `none` override sends the call anonymously.)
    const chosenAuth = (step.auth as Auth | undefined) ?? auth ?? target.auth;
    // A "parameter" auth request must have its auth supplied by the caller.
    if (chosenAuth.type === "parameter") {
        throw new Error(
            `Auth required: "${target.name}" defers its auth to the caller. Override auth on this Call step, or use a Set-auth step before it.`,
        );
    }
    const outgoing = buildOutgoing({ ...target, auth: resolveAuth(chosenAuth) }, resolver);
    let response: ResponseView;
    try {
        response = buildResponseView(await repo.send(outgoing));
    } catch (e) {
        throw new StepFailure(e instanceof Error ? e.message : "Request failed", outgoing);
    }
    let captured: string[];
    try {
        captured = applyCaptures(step.captures, response, scope);
    } catch (e) {
        // The exchange happened; the capture is what failed - keep both visible.
        throw new StepFailure(e instanceof Error ? e.message : String(e), outgoing, response);
    }
    return { name: target.name, outgoing, response, captured };
}

// Extract every capture from a response into the flow-scope. A capture that
// doesn't resolve (missing field, bad expression) is a hard failure: it throws
// so the step fails and the flow stops, rather than silently leaving the
// variable unset and letting later steps run on bad data.
function applyCaptures(captures: Capture[], response: ResponseView, scope: Map<string, string>): string[] {
    const captured: string[] = [];
    for (const c of captures) {
        if (!c.variable && !c.expr.trim()) continue; // ignore blank rows
        if (!c.variable) throw new Error(`Capture for "${c.expr}" has no target variable`);
        const r = evaluate(c.expr, response.json, c.mode);
        if (r.kind === "value") {
            scope.set(c.variable, valueToString(r.value as Json));
            captured.push(c.variable);
        } else {
            const why = r.kind === "error" ? r.message : `no value at "${c.expr || "(empty)"}"`;
            throw new Error(`Couldn't capture "${c.variable}": ${why}`);
        }
    }
    return captured;
}

interface AssertFields {
    id: string;
    kind: AssertKind;
    expr: string;
    mode: ExprMode;
    op: AssertOp;
    value: string;
    label?: string;
    onFail?: "stop" | "continue";
}

function evalAssert(
    f: AssertFields,
    last: ResponseView | null,
    scope: Map<string, string>,
    envSnap: Map<string, string>,
    env: Environment | null,
) {
    const merged = new Map<string, string>([...envSnap, ...scope]);
    const ctx = makeContext("post", last, merged, env?.id ?? null);
    const value = resolveTemplate(f.value, lookupOf(scope, envSnap));
    const block: AssertBlock = {
        id: f.id,
        type: "assert",
        label: f.label ?? "",
        onFail: f.onFail ?? "stop",
        kind: f.kind,
        expr: f.expr,
        mode: f.mode,
        op: f.op,
        value,
    };
    return runAssert(block, ctx);
}

function runAssertStep(
    step: AssertStep,
    last: ResponseView | null,
    scope: Map<string, string>,
    envSnap: Map<string, string>,
    env: Environment | null,
) {
    return evalAssert(step, last, scope, envSnap, env);
}

async function runPoll(
    step: WaitStep,
    envSnap: Map<string, string>,
    scope: Map<string, string>,
    auth: Auth | null,
    env: Environment | null,
    isCancelled: () => boolean,
    resolveAuth: (a: Auth) => Auth,
    repo: RequestsRepository,
    onAttempt: (n: number) => void,
) {
    if (!step.requestId) throw new Error("No target request selected for this Poll step");
    let target;
    try {
        target = await repo.get(step.requestId);
    } catch {
        throw new Error("Target request not found (it may have been deleted)");
    }
    const preArgs = new Map<string, string>();
    for (const a of step.args) if (a.name) preArgs.set(a.name, resolveTemplate(a.value, lookupOf(scope, envSnap)));
    const missing = unmetRequiredParams(target, preArgs, scope, envSnap);
    if (missing.length) throw new Error(`Missing required parameter(s): ${missing.join(", ")}`);
    const chosenAuth = auth ?? target.auth;
    if (chosenAuth.type === "parameter") {
        throw new Error(
            `Auth required: "${target.name}" defers its auth to the caller. Use a Set-auth step before this Poll step.`,
        );
    }
    const start = performance.now();
    const max = Math.max(1, step.maxAttempts || 1);
    const timeout = Math.max(0, step.timeoutMs || 0);
    let attempts = 0;
    let met = false;
    let outgoing: OutgoingRequest | undefined;
    let response: ResponseView | undefined;

    while (attempts < max) {
        if (isCancelled()) break;
        if (timeout && performance.now() - start > timeout) break;
        attempts++;
        onAttempt(attempts);

        const argMap = new Map<string, string>();
        for (const a of step.args) if (a.name) argMap.set(a.name, resolveTemplate(a.value, lookupOf(scope, envSnap)));
        const resolver = (text: string) =>
            resolveTemplate(text, (n) =>
                argMap.has(n) ? argMap.get(n) : scope.has(n) ? scope.get(n) : envSnap.get(n),
            );
        outgoing = buildOutgoing({ ...target, auth: resolveAuth(chosenAuth) }, resolver);
        response = buildResponseView(await repo.send(outgoing));

        met = evalAssert(
            { id: step.id, kind: step.kind, expr: step.expr, mode: step.mode, op: step.op, value: step.value },
            response,
            scope,
            envSnap,
            env,
        ).passed;
        if (met || attempts >= max) break;
        if (timeout && performance.now() - start + step.intervalMs > timeout) break;
        await sleep(Math.max(0, step.intervalMs || 0));
    }

    if (met && response) {
        try {
            applyCaptures(step.captures, response, scope);
        } catch (e) {
            throw new StepFailure(e instanceof Error ? e.message : String(e), outgoing, response);
        }
    }
    return { name: target.name, attempts, met, outgoing, response };
}
