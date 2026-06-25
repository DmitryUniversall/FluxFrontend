// Request use-cases: assembling the outgoing request (with env resolution,
// auth and body) and the full send pipeline that runs pre/post scripts around
// the proxied call. The same scripting engine powers both stages.
import { collapseOmitEmpty } from "@/core/json-template";
import { resolveTemplate } from "@/main/features/environments/domain/use-cases";
import type { Environment } from "@/main/features/environments/domain/models";
import {
    makeContext,
    type AssertResult,
    type EnvMutation,
    type ResponseView,
} from "@/main/features/scripting/domain/context";
import { runStage } from "@/main/features/scripting/domain/engine";
import type { RequestsRepository } from "../data/requests-repository";
import type { Auth, HttpRequest, OutgoingRequest, ProxyResponse } from "./models";

type Resolver = (text: string) => string;

/** Build a snapshot map of the active environment's enabled variables. */
function snapshotOf(env: Environment | null): Map<string, string> {
    const map = new Map<string, string>();
    if (env) for (const v of env.variables) if (v.enabled && v.key) map.set(v.key, v.value);
    return map;
}

/** A resolver bound to a live snapshot (so pre-script writes are visible). */
function snapshotResolver(snapshot: Map<string, string>): Resolver {
    const pseudo: Environment = {
        id: "",
        owner_id: "",
        workspace_id: "",
        name: "",
        created_at: "",
        variables: [],
    };
    return (text: string) => {
        pseudo.variables = Array.from(snapshot, ([key, value]) => ({ key, value, enabled: true }));
        return resolveTemplate(text, pseudo);
    };
}

// Drop a key/value pair whose value is empty when it's flagged "skip if empty".
const skipEmpty = (send_empty: boolean | undefined, resolvedValue: string) =>
    send_empty === false && resolvedValue === "";

// Headers Flux attaches to every request unless you set them yourself. These are
// actually sent (not just displayed) so behaviour is identical across transports
// - notably the desktop's native client (reqwest) adds no User-Agent on its own,
// which some servers reject. Host / Content-Length stay with the transport, which
// computes them; Content-Type is set above from the body mode.
export const FLUX_USER_AGENT = "Flux/1.0";
const INJECTED_HEADERS: Record<string, string> = { "User-Agent": FLUX_USER_AGENT, Accept: "*/*" };

export function buildOutgoing(req: HttpRequest, resolve: Resolver): OutgoingRequest {
    const headers: Record<string, string> = {};
    for (const h of req.headers) {
        if (!(h.enabled && h.key)) continue;
        const value = resolve(h.value);
        if (skipEmpty(h.send_empty, value)) continue;
        headers[resolve(h.key)] = value;
    }

    // query params
    const pairs: string[] = [];
    for (const p of req.params) {
        if (!(p.enabled && p.key)) continue;
        const value = resolve(p.value);
        if (skipEmpty(p.send_empty, value)) continue;
        pairs.push(`${enc(resolve(p.key))}=${enc(value)}`);
    }

    // auth
    const auth = req.auth;
    if (auth.type === "bearer" && auth.token) headers["Authorization"] = `Bearer ${resolve(auth.token)}`;
    else if (auth.type === "basic")
        headers["Authorization"] = `Basic ${b64(`${resolve(auth.username)}:${resolve(auth.password)}`)}`;
    else if (auth.type === "apikey" && auth.api_key_name) {
        if (auth.add_to === "query") pairs.push(`${enc(resolve(auth.api_key_name))}=${enc(resolve(auth.key))}`);
        else headers[resolve(auth.api_key_name)] = resolve(auth.key);
    }

    // body
    let body: string | null = null;
    const mode = req.body.mode;
    if (mode === "json") {
        // Resolve templates first, then drop any fields flagged "omit when empty".
        body = collapseOmitEmpty(resolve(req.body.raw));
        if (!hasHeader(headers, "content-type")) headers["Content-Type"] = "application/json";
    } else if (mode === "text") {
        body = resolve(req.body.raw);
        if (!hasHeader(headers, "content-type")) headers["Content-Type"] = "text/plain";
    } else if (mode === "form") {
        body = req.body.form
            .filter((f) => f.enabled && f.key)
            .map((f) => ({ k: resolve(f.key), v: resolve(f.value), f }))
            .filter(({ v, f }) => !skipEmpty(f.send_empty, v))
            .map(({ k, v }) => `${enc(k)}=${enc(v)}`)
            .join("&");
        if (!hasHeader(headers, "content-type")) headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    // Auto-attach standard headers the user didn't set explicitly.
    for (const [k, v] of Object.entries(INJECTED_HEADERS)) if (!hasHeader(headers, k)) headers[k] = v;

    let url = resolve(req.url).trim();
    if (pairs.length) url += (url.includes("?") ? "&" : "?") + pairs.join("&");

    return { method: req.method, url, headers, body };
}

export function buildResponseView(resp: ProxyResponse): ResponseView {
    let json: ResponseView["json"];
    try {
        json = resp.body ? JSON.parse(resp.body) : undefined;
    } catch {
        json = undefined;
    }
    return {
        status: resp.status,
        statusText: resp.status_text,
        headers: resp.headers,
        body: resp.body,
        json,
        timeMs: resp.time_ms,
        sizeBytes: resp.size_bytes,
    };
}

export interface SendOutcome {
    response: ResponseView;
    logs: string[];
    tests: AssertResult[];
}

/**
 * Full send pipeline:
 *   1. seed snapshot from active env
 *   2. run pre-request scripts (may set vars used below)
 *   3. resolve templates + build the outgoing request
 *   4. proxy the call
 *   5. run post-response scripts (blocks + code)
 *   6. persist any environment writes from either stage
 */
export async function sendRequest(
    req: HttpRequest,
    repo: RequestsRepository,
    activeEnv: Environment | null,
    applyMutations: (m: EnvMutation[]) => Promise<void>,
    params: Record<string, string> = {},
    // Flattens an identity-typed auth into a concrete one (injected so this stays
    // independent of the identities store).
    resolveAuth: (a: Auth) => Auth = (a) => a,
    // Auth chosen at run time (for "parameter" auth) - wins over the saved auth.
    runtimeAuth?: Auth,
): Promise<SendOutcome> {
    const snapshot = snapshotOf(activeEnv);
    // Invocation (declared-parameter) values override the environment for this run.
    // Resolve each value once against the environment so {{vars}} and {{$dynamics}}
    // inside a parameter value/default expand.
    for (const [k, v] of Object.entries(params)) if (k) snapshot.set(k, resolveTemplate(v, activeEnv));
    const activeEnvId = activeEnv?.id ?? null;

    const pre = makeContext("pre", null, snapshot, activeEnvId);
    runStage(req.scripts.pre, pre);

    const resolve = snapshotResolver(snapshot);
    // Precedence: run-time auth (from the run form) -> a pre-request setAuth block ->
    // the saved auth. Then flatten any stored-identity reference into a concrete one.
    const effectiveAuth = resolveAuth(runtimeAuth ?? pre.authOverride ?? req.auth);
    const outgoing = buildOutgoing({ ...req, auth: effectiveAuth }, resolve);
    const proxyResp = await repo.send(outgoing);
    const response = buildResponseView(proxyResp);

    const post = makeContext("post", response, snapshot, activeEnvId);
    runStage(req.scripts.post, post);

    const mutations = [...pre.mutations, ...post.mutations];
    if (mutations.length) await applyMutations(mutations);

    const logs = [...pre.logs.map((l) => `[pre] ${l}`), ...post.logs.map((l) => `[post] ${l}`)];
    const tests = [...pre.testResults, ...post.testResults];
    return { response, logs, tests };
}

const enc = encodeURIComponent;
const b64 = (s: string) => (typeof btoa !== "undefined" ? btoa(s) : s);
const hasHeader = (h: Record<string, string>, name: string) =>
    Object.keys(h).some((k) => k.toLowerCase() === name.toLowerCase());
