// Dynamic variables: {{$name}} / {{$name:arg:arg}} tokens resolved at send time
// to a freshly generated value. Pure, dependency-free - the substitution layer,
// highlighter and autocomplete all read this registry.

export interface DynamicSpec {
    name: string; // e.g. "$uuid" or "$randomInt"
    description: string;
    args?: string; // hint shown in autocomplete, e.g. ":min:max"
}

export const DYNAMICS: DynamicSpec[] = [
    { name: "$uuid", description: "UUID v4" },
    { name: "$timestamp", description: "Unix time (seconds)" },
    { name: "$isoTimestamp", description: "ISO-8601 now" },
    { name: "$datetime", description: "ISO time with offset", args: ":+1h|-30m|+1d" },
    { name: "$randomInt", description: "Random integer", args: ":min:max" },
    { name: "$randomString", description: "Random string", args: ":len" },
    { name: "$randomAlphaNumeric", description: "Random alphanumeric", args: ":len" },
    { name: "$randomBoolean", description: "true or false" },
    { name: "$randomEmail", description: "Random email" },
    { name: "$randomFirstName", description: "Random first name" },
    { name: "$randomFullName", description: "Random full name" },
    { name: "$randomPhone", description: "Random phone number" },
];

const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Jamie", "Morgan", "Avery", "Quinn"];
const LAST = ["Smith", "Lee", "Patel", "Garcia", "Kim", "Nguyen", "Brown", "Walsh", "Ivanov", "Cohen"];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]) => a[rand(a.length)];

function uuidv4(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function randomString(len: number, alphabet: string): string {
    let s = "";
    for (let i = 0; i < len; i++) s += alphabet[rand(alphabet.length)];
    return s;
}

function applyOffset(base: Date, offset: string | undefined): Date {
    if (!offset) return base;
    const m = offset.match(/^([+-])(\d+)([smhd])$/);
    if (!m) return base;
    const sign = m[1] === "-" ? -1 : 1;
    const n = Number(m[2]) * sign;
    const unit = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[m[3]] ?? 0;
    return new Date(base.getTime() + n * unit);
}

export function isDynamic(inner: string): boolean {
    return inner.startsWith("$");
}

/** Resolve a dynamic token (inner string incl. leading `$`). Returns undefined
 *  for an unknown name so the caller can leave the literal token in place. */
export function resolveDynamic(inner: string): string | undefined {
    const [rawName, ...args] = inner.split(":");
    switch (rawName) {
        case "$uuid":
            return uuidv4();
        case "$timestamp":
            return String(Math.floor(Date.now() / 1000));
        case "$isoTimestamp":
            return new Date().toISOString();
        case "$datetime":
            return applyOffset(new Date(), args[0]).toISOString();
        case "$randomInt": {
            const min = args[0] !== undefined ? Number(args[0]) : 0;
            const max = args[1] !== undefined ? Number(args[1]) : 1000;
            return String(min + rand(Math.max(1, max - min + 1)));
        }
        case "$randomString":
            return randomString(args[0] ? Number(args[0]) : 12, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
        case "$randomAlphaNumeric":
            return randomString(args[0] ? Number(args[0]) : 12, "abcdefghijklmnopqrstuvwxyz0123456789");
        case "$randomBoolean":
            return Math.random() < 0.5 ? "true" : "false";
        case "$randomEmail":
            return `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}${rand(1000)}@example.com`;
        case "$randomFirstName":
            return pick(FIRST);
        case "$randomFullName":
            return `${pick(FIRST)} ${pick(LAST)}`;
        case "$randomPhone":
            return `+1${randomString(10, "0123456789")}`;
        default:
            return undefined;
    }
}
