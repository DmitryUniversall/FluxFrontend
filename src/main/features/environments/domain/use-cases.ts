// Environment use-cases: template resolution and immutable variable updates.
// Pure functions - no I/O - so they're trivial to reason about and reuse from
// both the request sender and the scripting engine.
import { resolveTemplate as coreResolve } from "@/core/template";
import type { Environment, EnvVariable } from "./models";

/** Replace {{var}} (and {{$dynamic}}) placeholders using `env`'s enabled vars. */
export function resolveTemplate(text: string, env: Environment | null): string {
    if (!text) return text;
    const map = new Map((env?.variables ?? []).filter((v) => v.enabled && v.key).map((v) => [v.key, v.value]));
    return coreResolve(text, (name) => map.get(name));
}

/** Raised when a write targets a "selected" variable with a value outside the
 *  variants it offers. Callers choose whether to surface it (flow steps, the
 *  save dialog) or quietly skip it (batch mutation apply). */
export class EnvValueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EnvValueError";
    }
}

/** Enabled, non-empty variants offered by a "selected" variable. */
export function variantOptions(variable: EnvVariable | undefined): string[] {
    if (!variable || variable.type !== "selected") return [];
    return (variable.options ?? []).filter((o) => o !== "");
}

/** Whether `value` may be assigned to `variable`. Raw variables accept anything;
 *  a "selected" variable only accepts one of its variants (an empty variant list
 *  is treated as unconstrained, so a half-configured var isn't unusable). */
export function isAllowedSelectedValue(variable: EnvVariable | undefined, value: string): boolean {
    if (!variable || variable.type !== "selected") return true;
    const opts = variantOptions(variable);
    return opts.length === 0 || opts.includes(value);
}

/** Return a copy of `env` with `key` set to `value` (created - as a raw var - if
 *  missing). Throws {@link EnvValueError} when `key` is an existing "selected"
 *  variable and `value` isn't one of its variants. */
export function withVariable(env: Environment, key: string, value: string): Environment {
    const idx = env.variables.findIndex((v) => v.key === key);
    const variables = [...env.variables];
    if (idx >= 0) {
        const existing = variables[idx];
        if (!isAllowedSelectedValue(existing, value)) {
            throw new EnvValueError(
                `"${key}" is a selectable variable - it only accepts: ${variantOptions(existing).join(", ")}`,
            );
        }
        variables[idx] = { ...existing, value, enabled: true };
    } else {
        variables.push({ key, value, enabled: true });
    }
    return { ...env, variables };
}
