// OpenAPI / Swagger -> Flux requests. Parses a spec (JSON or YAML, Swagger 2.0 or
// OpenAPI 3.x) into a flat list of operations the import screen can preview and
// turn into requests. Path templating ({id}) is rewritten to Flux's {{id}} and
// surfaced as declared parameters; query/header params, request bodies (JSON
// example synthesised from the schema) and security schemes are mapped to the
// request's fields. Pure and dependency-light (only a YAML loader).
/* eslint-disable @typescript-eslint/no-explicit-any */
import yaml from "js-yaml";
import type { Auth, Body, KeyValue, Method, RequestParam } from "@/main/features/request-editor/domain/models";
import { METHODS } from "@/main/features/request-editor/domain/models";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

export interface BuildOptions {
    baseUrl: string; // chosen server URL (may itself be a {{template}})
}

export interface RequestFields {
    name: string;
    method: Method;
    url: string;
    params: KeyValue[];
    headers: KeyValue[];
    auth: Auth;
    body: Body;
    parameters: RequestParam[];
}

export interface ImportOperation {
    key: string; // stable selection id (METHOD path)
    method: Method;
    path: string;
    summary: string;
    operationId: string;
    tag: string;
    deprecated: boolean;
    build: (opts: BuildOptions) => RequestFields;
}

export interface ParsedSpec {
    ok: true;
    title: string;
    version: string;
    specVersion: "2.0" | "3.x";
    servers: string[]; // candidate base URLs, default substituted
    operations: ImportOperation[];
}

export interface ParseError {
    ok: false;
    error: string;
}

export type ParseResult = ParsedSpec | ParseError;

// ---- helpers ---------------------------------------------------------------

const blankAuth = (): Auth => ({
    type: "none",
    token: "",
    username: "",
    password: "",
    key: "",
    api_key_name: "",
    add_to: "header",
});

const kv = (key: string, value: string, enabled: boolean): KeyValue => ({ key, value, enabled, send_empty: false });

function loadDoc(text: string): any {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("The spec is empty.");
    try {
        return JSON.parse(trimmed);
    } catch {
        // not JSON - try YAML
    }
    const doc = yaml.load(trimmed);
    if (doc == null || typeof doc !== "object") throw new Error("Couldn't parse the spec as JSON or YAML.");
    return doc;
}

function resolvePointer(doc: any, ref: string): any {
    if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;
    const parts = ref
        .slice(2)
        .split("/")
        .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
    let cur: any = doc;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = cur[p];
    }
    return cur;
}

// Shallow deref: follow a chain of $ref nodes (with a cycle guard) and return the
// concrete node. Nested members keep their own $refs (resolved lazily elsewhere).
function deref(node: any, doc: any, seen = new Set<string>()): any {
    let cur = node;
    while (cur && typeof cur === "object" && typeof cur.$ref === "string") {
        if (seen.has(cur.$ref)) return {};
        seen.add(cur.$ref);
        cur = resolvePointer(doc, cur.$ref);
    }
    return cur ?? {};
}

function asString(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return "";
    }
}

const MAX_DEPTH = 6;

function stringExample(schema: any): string {
    switch (schema.format) {
        case "date-time":
            return new Date().toISOString();
        case "date":
            return new Date().toISOString().slice(0, 10);
        case "uuid":
            return "00000000-0000-0000-0000-000000000000";
        case "email":
            return "user@example.com";
        case "uri":
        case "url":
            return "https://example.com";
        case "byte":
        case "binary":
            return "";
        default:
            return "string";
    }
}

// Synthesise an example value from a JSON schema (depth- and cycle-guarded).
function exampleFromSchema(schema: any, doc: any, depth: number, seen: Set<string>): any {
    if (!schema || typeof schema !== "object") return null;

    if (typeof schema.$ref === "string") {
        if (seen.has(schema.$ref) || depth > MAX_DEPTH) return {};
        const next = new Set(seen).add(schema.$ref);
        return exampleFromSchema(resolvePointer(doc, schema.$ref), doc, depth + 1, next);
    }

    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];

    if (Array.isArray(schema.allOf) && schema.allOf.length) {
        const merged: any = {};
        for (const part of schema.allOf) {
            const v = exampleFromSchema(part, doc, depth + 1, seen);
            if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(merged, v);
        }
        return merged;
    }
    const combo = schema.oneOf || schema.anyOf;
    if (Array.isArray(combo) && combo.length) return exampleFromSchema(combo[0], doc, depth + 1, seen);

    const type = schema.type || (schema.properties ? "object" : schema.items ? "array" : undefined);
    switch (type) {
        case "object": {
            const out: Record<string, any> = {};
            const props = schema.properties || {};
            if (depth <= MAX_DEPTH) {
                for (const [k, v] of Object.entries(props)) out[k] = exampleFromSchema(v, doc, depth + 1, seen);
            }
            return out;
        }
        case "array":
            return depth > MAX_DEPTH ? [] : [exampleFromSchema(schema.items || {}, doc, depth + 1, seen)];
        case "string":
            return stringExample(schema);
        case "integer":
            return 0;
        case "number":
            return 0;
        case "boolean":
            return false;
        default:
            return null;
    }
}

function jsonBody(schema: any, doc: any): Body {
    const example = exampleFromSchema(schema, doc, 0, new Set());
    return { mode: "json", raw: JSON.stringify(example ?? {}, null, 2), form: [] };
}

function formBodyFromSchema(schema: any, doc: any): Body {
    const resolved = deref(schema, doc);
    const props = resolved.properties || {};
    const form: KeyValue[] = [];
    const required: string[] = Array.isArray(resolved.required) ? resolved.required : [];
    for (const [k, v] of Object.entries(props)) {
        const ex = exampleFromSchema(v, doc, 1, new Set());
        form.push(kv(k, ex == null ? "" : asString(ex), required.includes(k)));
    }
    return { mode: "form", raw: "", form };
}

// ---- security mapping ------------------------------------------------------

interface SecScheme {
    type?: string;
    scheme?: string; // http: bearer/basic
    in?: string; // apiKey
    name?: string; // apiKey header/query name
    flow?: string; // swagger2 oauth2
}

function pickSecurity(opSecurity: any, globalSecurity: any, schemes: Record<string, SecScheme>): Auth {
    const requirements: any[] = Array.isArray(opSecurity)
        ? opSecurity
        : Array.isArray(globalSecurity)
          ? globalSecurity
          : [];
    for (const req of requirements) {
        const schemeName = req && typeof req === "object" ? Object.keys(req)[0] : undefined;
        if (!schemeName) continue;
        const scheme = schemes[schemeName];
        if (!scheme) continue;
        const auth = authFromScheme(scheme);
        if (auth.type !== "none") return auth;
    }
    return blankAuth();
}

function authFromScheme(scheme: SecScheme): Auth {
    const auth = blankAuth();
    const type = (scheme.type || "").toLowerCase();
    if (type === "http") {
        if ((scheme.scheme || "").toLowerCase() === "basic") {
            auth.type = "basic";
        } else {
            auth.type = "bearer";
            auth.token = "{{access_token}}";
        }
    } else if (type === "apikey") {
        auth.type = "apikey";
        auth.api_key_name = scheme.name || "X-API-Key";
        auth.key = "{{api_key}}";
        auth.add_to = (scheme.in || "header").toLowerCase() === "query" ? "query" : "header";
    } else if (type === "oauth2" || type === "openidconnect") {
        auth.type = "bearer";
        auth.token = "{{access_token}}";
    } else if (type === "basic") {
        // Swagger 2.0 basicAuth
        auth.type = "basic";
    }
    return auth;
}

// ---- URL assembly ----------------------------------------------------------

function templatePath(path: string): string {
    return path.replace(/\{([^}]+)\}/g, (_m, name) => `{{${String(name).trim()}}}`);
}

function joinUrl(base: string, path: string): string {
    const b = base.replace(/\/+$/, "");
    const p = templatePath(path);
    if (!b) return p;
    if (!p) return b;
    return b + (p.startsWith("/") ? p : "/" + p);
}

// ---- servers ---------------------------------------------------------------

function serversV3(doc: any): string[] {
    const out: string[] = [];
    for (const s of Array.isArray(doc.servers) ? doc.servers : []) {
        if (!s || typeof s.url !== "string") continue;
        const url = s.url.replace(/\{(\w+)\}/g, (_m: string, k: string) => {
            const def = s.variables?.[k]?.default;
            return def != null ? String(def) : `{${k}}`;
        });
        out.push(url);
    }
    return out.length ? out : [""];
}

function serversV2(doc: any): string[] {
    const schemes: string[] = Array.isArray(doc.schemes) && doc.schemes.length ? doc.schemes : ["https"];
    const host: string = typeof doc.host === "string" ? doc.host : "";
    const basePath: string = typeof doc.basePath === "string" ? doc.basePath : "";
    if (!host) return [basePath || ""];
    return schemes.map((sc) => `${sc}://${host}${basePath}`);
}

// ---- parameter mapping -----------------------------------------------------

function mergedParams(pathItem: any, op: any, doc: any): any[] {
    const list: any[] = [];
    const push = (arr: any) => {
        for (const p of Array.isArray(arr) ? arr : []) list.push(deref(p, doc));
    };
    push(pathItem.parameters);
    push(op.parameters);
    // operation-level overrides path-level by (name + in)
    const byKey = new Map<string, any>();
    for (const p of list) byKey.set(`${p.in}\u0000${p.name}`, p);
    return Array.from(byKey.values());
}

function paramExample(param: any): string {
    if (param.example !== undefined) return asString(param.example);
    const schema = param.schema;
    if (schema && typeof schema === "object") {
        if (schema.example !== undefined) return asString(schema.example);
        if (schema.default !== undefined) return asString(schema.default);
        if (Array.isArray(schema.enum) && schema.enum.length) return asString(schema.enum[0]);
    }
    if (param.default !== undefined) return asString(param.default);
    if (Array.isArray(param.enum) && param.enum.length) return asString(param.enum[0]);
    return "";
}

// An `enum` (on the param or its schema) becomes the param's preset variants,
// so an imported path parameter is quick-picked rather than typed.
function paramEnumOptions(param: any): string[] {
    const raw: unknown = Array.isArray(param.enum)
        ? param.enum
        : Array.isArray(param.schema?.enum)
          ? param.schema.enum
          : [];
    return (raw as unknown[]).map((v) => asString(v)).filter((s) => s !== "");
}

const SKIP_HEADERS = new Set(["authorization", "content-type", "accept"]);

// ---- main ------------------------------------------------------------------

export function parseOpenApi(text: string): ParseResult {
    let doc: any;
    try {
        doc = loadDoc(text);
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Could not parse the spec." };
    }

    const isV3 = typeof doc.openapi === "string" && doc.openapi.startsWith("3");
    const isV2 =
        doc.swagger === "2.0" || doc.swagger === 2 || (typeof doc.swagger === "string" && doc.swagger.startsWith("2"));
    if (!isV3 && !isV2) {
        return {
            ok: false,
            error: "Unrecognised spec: expected an OpenAPI 3.x (openapi: 3.x) or Swagger 2.0 (swagger: 2.0) document.",
        };
    }
    if (!doc.paths || typeof doc.paths !== "object") {
        return { ok: false, error: "The spec has no paths to import." };
    }

    const specVersion: "2.0" | "3.x" = isV3 ? "3.x" : "2.0";
    const title = doc.info?.title ? String(doc.info.title) : "Imported API";
    const version = doc.info?.version ? String(doc.info.version) : "";
    const servers = isV3 ? serversV3(doc) : serversV2(doc);

    const schemes: Record<string, SecScheme> = (isV3 ? doc.components?.securitySchemes : doc.securityDefinitions) || {};
    const globalSecurity = doc.security;

    const operations: ImportOperation[] = [];

    for (const [path, rawItem] of Object.entries<any>(doc.paths)) {
        const pathItem = deref(rawItem, doc);
        if (!pathItem || typeof pathItem !== "object") continue;

        for (const m of HTTP_METHODS) {
            const op = pathItem[m];
            if (!op || typeof op !== "object") continue;

            const methodUpper = m.toUpperCase() as Method;
            if (!(METHODS as string[]).includes(methodUpper)) continue;

            const params = mergedParams(pathItem, op, doc);
            const tags: string[] = Array.isArray(op.tags) && op.tags.length ? op.tags.map(String) : [];
            const tag = tags[0] || "default";
            const operationId = typeof op.operationId === "string" ? op.operationId : "";
            const summary =
                (typeof op.summary === "string" && op.summary.trim()) || operationId || `${methodUpper} ${path}`;
            const deprecated = op.deprecated === true;

            // Capture everything the builder needs.
            const build = (opts: BuildOptions): RequestFields => {
                const url = joinUrl(opts.baseUrl, path);
                const queryParams: KeyValue[] = [];
                const headers: KeyValue[] = [];
                const declared: RequestParam[] = [];
                let body: Body = { mode: "none", raw: "", form: [] };

                for (const p of params) {
                    const where = (p.in || "").toLowerCase();
                    if (where === "path") {
                        declared.push({
                            name: String(p.name || "").trim(),
                            default: paramExample(p),
                            required: true,
                            description: typeof p.description === "string" ? p.description : "",
                            options: paramEnumOptions(p),
                        });
                    } else if (where === "query") {
                        if (p.name) queryParams.push(kv(String(p.name), paramExample(p), p.required === true));
                    } else if (where === "header") {
                        const name = String(p.name || "");
                        if (name && !SKIP_HEADERS.has(name.toLowerCase()))
                            headers.push(kv(name, paramExample(p), p.required === true));
                    } else if (where === "body" && p.schema) {
                        // Swagger 2.0 body parameter
                        body = jsonBody(p.schema, doc);
                    } else if (where === "formdata") {
                        const ex = paramExample(p);
                        if (body.mode !== "form") body = { mode: "form", raw: "", form: [] };
                        if (p.name) body.form.push(kv(String(p.name), ex, p.required === true));
                    }
                }

                // OpenAPI 3 request body
                if (isV3 && op.requestBody) {
                    const rb = deref(op.requestBody, doc);
                    const content = rb.content || {};
                    const types = Object.keys(content);
                    const jsonType = types.find((t) => /json/i.test(t));
                    const formType = types.find((t) => /x-www-form-urlencoded/i.test(t));
                    const multipartType = types.find((t) => /multipart\/form-data/i.test(t));
                    const textType = types.find((t) => /^text\//i.test(t));
                    if (jsonType) {
                        body = jsonBody(content[jsonType]?.schema, doc);
                    } else if (formType || multipartType) {
                        body = formBodyFromSchema(content[(formType || multipartType) as string]?.schema, doc);
                    } else if (textType) {
                        const ex = exampleFromSchema(content[textType]?.schema, doc, 0, new Set());
                        body = { mode: "text", raw: ex == null ? "" : asString(ex), form: [] };
                    } else if (types.length) {
                        body = jsonBody(content[types[0]]?.schema, doc);
                    }
                }

                const auth = pickSecurity(op.security, globalSecurity, schemes);
                if (auth.type === "apikey" && auth.add_to === "query") {
                    // keep it as auth (buildOutgoing appends it); nothing else to do
                }

                return {
                    name: summary,
                    method: methodUpper,
                    url,
                    params: queryParams,
                    headers,
                    auth,
                    body,
                    parameters: declared.filter((d) => d.name),
                };
            };

            operations.push({
                key: `${methodUpper} ${path}`,
                method: methodUpper,
                path,
                summary,
                operationId,
                tag,
                deprecated,
                build,
            });
        }
    }

    if (operations.length === 0) {
        return { ok: false, error: "No operations found in the spec." };
    }

    return { ok: true, title, version, specVersion, servers, operations };
}
