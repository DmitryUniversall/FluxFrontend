// Single substitution layer for {{...}} tokens: dynamic variables ({{$...}})
// resolve via the dynamics registry; everything else is looked up by name. The
// lookup encapsulates the scope chain (temp-override -> … -> environment).
import { resolveDynamic } from "./dynamics";

export type Lookup = (name: string) => string | undefined;

// Inner charset covers var names ([\w.-]) and dynamic args ($name:+1h:max).
const TOKEN = /\{\{\s*([\w$.\-:+]+)\s*\}\}/g;

export function resolveTemplate(text: string, lookup: Lookup): string {
    if (!text) return text;
    return text.replace(TOKEN, (whole, inner: string) => {
        if (inner.startsWith("$")) {
            const d = resolveDynamic(inner);
            return d ?? whole;
        }
        const v = lookup(inner);
        return v !== undefined ? v : whole;
    });
}
