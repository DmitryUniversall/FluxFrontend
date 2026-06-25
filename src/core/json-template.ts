// Template-aware JSON parser/serializer (foundation for the JSON body builder).
// Standard JSON.parse chokes on a bare {{...}} used as a value; this tolerant
// parser treats such tokens as a distinct "expression" node, so
//   {"id": {{$uuid}}}
// parses as { id: <expr "{{$uuid}}"> } and round-trips losslessly.
//
//   string  + {{x}}  -> serialized "{{x}}" (a string)
//   expression {{x}} -> serialized {{x}}   (unquoted; resolves to a value)
//
// On send the serialized text is run through the substitution layer, so
// expression nodes become real JSON fragments (numbers, booleans, objects…).

export type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null" | "expression";

export interface Entry {
    id: string;
    key: string; // ignored for arrays
    node: JsonNode;
    omitEmpty?: boolean; // object fields only: drop the key when its value is empty
}

// Marker used to persist `omitEmpty` losslessly inside the raw JSON string. A
// flagged field "k": V serializes as "k": { "<OMIT_KEY>": V }; the parser
// detects this shape to restore the flag, and `collapseOmitEmpty` unwraps it at
// send time (dropping the key when the resolved value is empty).
export const OMIT_KEY = "__flux_omit_if_empty__";

export interface JsonNode {
    id: string;
    type: JsonNodeType;
    value: string; // primitives & expression (raw text); "" for containers
    entries: Entry[]; // object/array children; [] otherwise
}

export type ParseResult = { ok: true; node: JsonNode } | { ok: false; error: string };

let _seq = 0;
const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `n${_seq++}_${Math.random().toString(36).slice(2)}`;

export function makeNode(type: JsonNodeType, value = ""): JsonNode {
    return { id: uid(), type, value, entries: [] };
}
export function emptyObject(): JsonNode {
    return makeNode("object");
}
export function makeEntry(key: string, node: JsonNode): Entry {
    return { id: uid(), key, node };
}

// Is the value exactly a single {{...}} token? (used to offer the raw/string toggle)
export function isSingleTemplate(value: string): boolean {
    return /^\s*\{\{\s*[\w$.\-:+]+\s*\}\}\s*$/.test(value);
}

// ---- parser ----
class Parser {
    i = 0;
    constructor(private s: string) {}
    eof() {
        return this.i >= this.s.length;
    }
    peek() {
        return this.s[this.i];
    }
    ws() {
        while (!this.eof() && /\s/.test(this.s[this.i])) this.i++;
    }
    expect(ch: string) {
        if (this.s[this.i] !== ch) throw new Error(`Expected '${ch}' at position ${this.i}`);
        this.i++;
    }

    parseValue(): JsonNode {
        this.ws();
        if (this.eof()) throw new Error("Unexpected end of input");
        const c = this.peek();
        if (c === "{" && this.s[this.i + 1] === "{") return this.parseExpr();
        if (c === "{") return this.parseObject();
        if (c === "[") return this.parseArray();
        if (c === '"') return makeNode("string", this.parseString());
        if (c === "-" || (c >= "0" && c <= "9")) return this.parseNumber();
        if (this.s.startsWith("true", this.i)) {
            this.i += 4;
            return makeNode("boolean", "true");
        }
        if (this.s.startsWith("false", this.i)) {
            this.i += 5;
            return makeNode("boolean", "false");
        }
        if (this.s.startsWith("null", this.i)) {
            this.i += 4;
            return makeNode("null", "");
        }
        throw new Error(`Unexpected '${c}' at position ${this.i}`);
    }

    parseExpr(): JsonNode {
        const start = this.i;
        const end = this.s.indexOf("}}", this.i + 2);
        if (end === -1) throw new Error(`Unterminated {{ }} at position ${start}`);
        const raw = this.s.slice(start, end + 2);
        this.i = end + 2;
        return makeNode("expression", raw);
    }

    parseObject(): JsonNode {
        this.expect("{");
        const node = makeNode("object");
        this.ws();
        if (this.peek() === "}") {
            this.i++;
            return node;
        }
        for (;;) {
            this.ws();
            if (this.peek() !== '"') throw new Error(`Expected string key at position ${this.i}`);
            const key = this.parseString();
            this.ws();
            this.expect(":");
            const val = this.parseValue();
            // Unwrap an omit-if-empty sentinel ({ "<OMIT_KEY>": inner }) back into a
            // flagged entry.
            let child = val;
            let omit = false;
            if (val.type === "object" && val.entries.length === 1 && val.entries[0].key === OMIT_KEY) {
                child = val.entries[0].node;
                omit = true;
            }
            const entry = makeEntry(key, child);
            if (omit) entry.omitEmpty = true;
            node.entries.push(entry);
            this.ws();
            const c = this.peek();
            if (c === ",") {
                this.i++;
                continue;
            }
            if (c === "}") {
                this.i++;
                break;
            }
            throw new Error(`Expected ',' or '}' at position ${this.i}`);
        }
        return node;
    }

    parseArray(): JsonNode {
        this.expect("[");
        const node = makeNode("array");
        this.ws();
        if (this.peek() === "]") {
            this.i++;
            return node;
        }
        for (;;) {
            const val = this.parseValue();
            node.entries.push(makeEntry("", val));
            this.ws();
            const c = this.peek();
            if (c === ",") {
                this.i++;
                continue;
            }
            if (c === "]") {
                this.i++;
                break;
            }
            throw new Error(`Expected ',' or ']' at position ${this.i}`);
        }
        return node;
    }

    parseString(): string {
        this.expect('"');
        let out = "";
        while (!this.eof()) {
            const ch = this.s[this.i++];
            if (ch === '"') return out;
            if (ch === "\\") {
                const e = this.s[this.i++];
                if (e === "n") out += "\n";
                else if (e === "t") out += "\t";
                else if (e === "r") out += "\r";
                else if (e === "b") out += "\b";
                else if (e === "f") out += "\f";
                else if (e === "/") out += "/";
                else if (e === '"') out += '"';
                else if (e === "\\") out += "\\";
                else if (e === "u") {
                    const hex = this.s.slice(this.i, this.i + 4);
                    this.i += 4;
                    out += String.fromCharCode(parseInt(hex, 16));
                } else out += e;
            } else out += ch;
        }
        throw new Error("Unterminated string");
    }

    parseNumber(): JsonNode {
        const m = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(this.s.slice(this.i));
        if (!m) throw new Error(`Invalid number at position ${this.i}`);
        this.i += m[0].length;
        return makeNode("number", m[0]);
    }
}

export function parseTemplateJson(text: string): ParseResult {
    if (!text.trim()) return { ok: true, node: emptyObject() };
    try {
        const p = new Parser(text);
        const node = p.parseValue();
        p.ws();
        if (!p.eof()) throw new Error(`Unexpected trailing '${p.peek()}' at position ${p.i}`);
        return { ok: true, node };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

// ---- send-time: collapse omit-if-empty wrappers ----
// Runs on the *resolved* JSON body (after templates are substituted). Replaces
// each { "<OMIT_KEY>": V } wrapper with V, or drops the owning key entirely when
// V is empty (""/null). If the body isn't valid JSON, it's returned unchanged.
function isEmptyValue(v: unknown): boolean {
    return v === "" || v === null || v === undefined;
}
function isOmitWrapper(v: unknown): v is Record<string, unknown> {
    return (
        !!v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        Object.keys(v as object).length === 1 &&
        OMIT_KEY in (v as object)
    );
}
export function collapseOmitEmpty(text: string): string {
    if (!text.includes(OMIT_KEY)) return text;
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return text; // not valid JSON (yet) - leave it for the server to reject
    }
    const walk = (v: unknown): unknown => {
        if (Array.isArray(v)) return v.map((it) => (isOmitWrapper(it) ? walk(it[OMIT_KEY]) : walk(it)));
        if (v && typeof v === "object") {
            const out: Record<string, unknown> = {};
            for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
                if (isOmitWrapper(val)) {
                    if (isEmptyValue(val[OMIT_KEY])) continue; // drop the key
                    out[k] = walk(val[OMIT_KEY]);
                } else {
                    out[k] = walk(val);
                }
            }
            return out;
        }
        return v;
    };
    return JSON.stringify(walk(data), null, 2);
}

// ---- serializer (pretty, preserves key order) ----
export function serializeTemplateJson(node: JsonNode, indent = 2): string {
    const ser = (n: JsonNode, depth: number): string => {
        const pad = " ".repeat(indent * (depth + 1));
        const end = " ".repeat(indent * depth);
        switch (n.type) {
            case "object": {
                if (n.entries.length === 0) return "{}";
                const field = (e: Entry) => {
                    const inner = ser(e.node, depth + 1);
                    const value = e.omitEmpty ? `{ ${JSON.stringify(OMIT_KEY)}: ${inner} }` : inner;
                    return pad + JSON.stringify(e.key) + ": " + value;
                };
                return "{\n" + n.entries.map(field).join(",\n") + "\n" + end + "}";
            }
            case "array":
                if (n.entries.length === 0) return "[]";
                return "[\n" + n.entries.map((e) => pad + ser(e.node, depth + 1)).join(",\n") + "\n" + end + "]";
            case "string":
                return JSON.stringify(n.value);
            case "number":
                return n.value.trim() === "" ? "0" : n.value.trim();
            case "boolean":
                return n.value === "true" ? "true" : "false";
            case "null":
                return "null";
            case "expression":
                return n.value.trim() || "{{}}";
        }
    };
    return ser(node, 0);
}
