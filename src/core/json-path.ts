// Utilities for working with JSON paths. These power both the response tree
// (right-click -> save) and the scripting engine (extracting a value by path).
import type { Json, JsonKind, JsonPath } from "./types";

export function kindOf(value: Json): JsonKind {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    const t = typeof value;
    if (t === "object") return "object";
    return t as JsonKind;
}

/** Read a value at the given path; returns undefined if the path is invalid. */
export function getByPath(value: Json, path: JsonPath): Json | undefined {
    let current: Json | undefined = value;
    for (const seg of path) {
        if (current === null || current === undefined) return undefined;
        if (typeof seg === "number") {
            if (!Array.isArray(current)) return undefined;
            current = current[seg];
        } else {
            if (typeof current !== "object" || Array.isArray(current)) return undefined;
            current = (current as Record<string, Json>)[seg];
        }
    }
    return current;
}

/** A human-friendly accessor like `data.users[0].id`. */
export function pathToDisplay(path: JsonPath): string {
    if (path.length === 0) return "$";
    let out = "";
    for (const seg of path) {
        if (typeof seg === "number") out += `[${seg}]`;
        else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(seg)) out += out ? `.${seg}` : seg;
        else out += `["${seg}"]`;
    }
    return out;
}

/** Coerce a JSON leaf to the string that gets stored in an environment var. */
export function valueToString(value: Json | undefined): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

/** Suggest a variable name from the last key in a path, e.g. `userId`. */
export function suggestVarName(path: JsonPath): string {
    for (let i = path.length - 1; i >= 0; i--) {
        const seg = path[i];
        if (typeof seg === "string" && seg) return seg;
    }
    return "value";
}

/** Parse `data.users[0].id` (or `data.users.0.id`) into ["data","users",0,"id"]. */
export function parsePath(path: string): JsonPath {
    const out: JsonPath = [];
    for (const part of path.split(".")) {
        if (!part) continue;
        const re = /([^[\]]+)|\[(\d+)\]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(part))) {
            if (m[2] !== undefined) out.push(Number(m[2]));
            else out.push(m[1]);
        }
    }
    return out;
}
