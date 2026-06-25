// cURL import/export. parseCurl turns a pasted command into request fields;
// toCurl renders a resolved outgoing request as a runnable curl command.
import type { Auth, Body, KeyValue, Method, OutgoingRequest } from "./models";
import { METHODS } from "./models";

export interface ParsedCurl {
    method: Method;
    url: string;
    params: KeyValue[];
    headers: KeyValue[];
    body: Body;
    auth: Auth | null;
}

const kv = (key: string, value: string): KeyValue => ({ key, value, enabled: true });

// ---- export ----
const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

export function toCurl(out: OutgoingRequest): string {
    const parts: string[] = [];
    parts.push(
        out.method.toUpperCase() === "GET"
            ? `curl ${shellQuote(out.url)}`
            : `curl -X ${out.method.toUpperCase()} ${shellQuote(out.url)}`,
    );
    for (const [k, v] of Object.entries(out.headers)) parts.push(`-H ${shellQuote(`${k}: ${v}`)}`);
    if (out.body) parts.push(`--data ${shellQuote(out.body)}`);
    return parts.join(" \\\n  ");
}

// ---- import ----
/** Tokenize a shell-ish command, honouring quotes, escapes and \\<newline>. */
function tokenize(input: string): string[] {
    const s = input.replace(/\\\r?\n/g, " ");
    const out: string[] = [];
    let cur = "";
    let quote: '"' | "'" | null = null;
    let has = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (quote) {
            if (c === quote) {
                quote = null;
            } else if (quote === '"' && c === "\\" && i + 1 < s.length) {
                cur += s[++i];
            } else {
                cur += c;
            }
            continue;
        }
        if (c === "'" || c === '"') {
            quote = c;
            has = true;
        } else if (c === "\\" && i + 1 < s.length) {
            cur += s[++i];
            has = true;
        } else if (/\s/.test(c)) {
            if (has || cur) out.push(cur);
            cur = "";
            has = false;
        } else {
            cur += c;
            has = true;
        }
    }
    if (has || cur) out.push(cur);
    return out;
}

const NO_ARG = new Set([
    "--compressed",
    "-s",
    "--silent",
    "-L",
    "--location",
    "-k",
    "--insecure",
    "-i",
    "--include",
    "-v",
    "--verbose",
    "-f",
    "--fail",
    "-g",
    "--globoff",
    "-#",
    "--progress-bar",
]);

const decode = (s: string) => {
    try {
        return decodeURIComponent(s.replace(/\+/g, " "));
    } catch {
        return s;
    }
};

const looksJson = (s: string) => {
    const t = s.trim();
    if (!t || !/^[[{]/.test(t)) return false;
    try {
        JSON.parse(t);
        return true;
    } catch {
        return false;
    }
};

export function parseCurl(input: string): ParsedCurl {
    const tokens = tokenize(input.trim());
    let method = "";
    let url = "";
    let user = "";
    const headers: KeyValue[] = [];
    const datas: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (i === 0 && t === "curl") continue;
        switch (t) {
            case "-X":
            case "--request":
                method = tokens[++i] ?? "";
                break;
            case "-H":
            case "--header": {
                const raw = tokens[++i] ?? "";
                const idx = raw.indexOf(":");
                if (idx > 0) headers.push(kv(raw.slice(0, idx).trim(), raw.slice(idx + 1).trim()));
                break;
            }
            case "-d":
            case "--data":
            case "--data-raw":
            case "--data-ascii":
            case "--data-binary":
            case "--data-urlencode":
                datas.push(tokens[++i] ?? "");
                break;
            case "-u":
            case "--user":
                user = tokens[++i] ?? "";
                break;
            case "--url":
                url = tokens[++i] ?? "";
                break;
            case "-A":
            case "--user-agent":
                headers.push(kv("User-Agent", tokens[++i] ?? ""));
                break;
            case "-b":
            case "--cookie":
                headers.push(kv("Cookie", tokens[++i] ?? ""));
                break;
            case "-e":
            case "--referer":
                headers.push(kv("Referer", tokens[++i] ?? ""));
                break;
            default:
                if (NO_ARG.has(t)) break;
                if (!t.startsWith("-") && !url) url = t;
                // unknown flags are ignored
                break;
        }
    }

    // split query string out of the URL into params
    const params: KeyValue[] = [];
    let base = url;
    const qi = url.indexOf("?");
    if (qi >= 0) {
        base = url.slice(0, qi);
        for (const pair of url.slice(qi + 1).split("&")) {
            if (!pair) continue;
            const eq = pair.indexOf("=");
            if (eq >= 0) params.push(kv(decode(pair.slice(0, eq)), decode(pair.slice(eq + 1))));
            else params.push(kv(decode(pair), ""));
        }
    }

    // auth: -u -> basic; Authorization: Bearer -> bearer (lifted out of headers)
    let auth: Auth | null = null;
    if (user) {
        const c = user.indexOf(":");
        auth = blankAuth("basic");
        auth.username = c >= 0 ? user.slice(0, c) : user;
        auth.password = c >= 0 ? user.slice(c + 1) : "";
    }
    const authHeaderIdx = headers.findIndex((h) => h.key.toLowerCase() === "authorization");
    if (!auth && authHeaderIdx >= 0 && /^bearer\s+/i.test(headers[authHeaderIdx].value)) {
        auth = blankAuth("bearer");
        auth.token = headers[authHeaderIdx].value.replace(/^bearer\s+/i, "");
        headers.splice(authHeaderIdx, 1);
    }

    // body
    const raw = datas.join("&");
    const ct = headers.find((h) => h.key.toLowerCase() === "content-type")?.value.toLowerCase() ?? "";
    const body: Body = { mode: "none", raw: "", form: [] };
    if (raw) {
        if (ct.includes("x-www-form-urlencoded")) {
            body.mode = "form";
            for (const pair of raw.split("&")) {
                if (!pair) continue;
                const eq = pair.indexOf("=");
                body.form.push(
                    eq >= 0 ? kv(decode(pair.slice(0, eq)), decode(pair.slice(eq + 1))) : kv(decode(pair), ""),
                );
            }
        } else if (ct.includes("json") || looksJson(raw)) {
            body.mode = "json";
            body.raw = raw;
        } else {
            body.mode = "text";
            body.raw = raw;
        }
    }

    const upper = method.toUpperCase();
    const finalMethod: Method = (METHODS as string[]).includes(upper)
        ? (upper as Method)
        : datas.length
          ? "POST"
          : "GET";

    return { method: finalMethod, url: base, params, headers, body, auth };
}

function blankAuth(type: Auth["type"]): Auth {
    return { type, token: "", username: "", password: "", key: "", api_key_name: "", add_to: "header" };
}
