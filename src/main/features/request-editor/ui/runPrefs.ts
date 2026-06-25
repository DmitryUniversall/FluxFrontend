// Per-request run preferences kept in localStorage (UI-only, not part of the
// request model): whether to always show the parameter form before sending,
// and the last-used parameter values (shared with the run dialog).
const forceKey = (id: string) => `flux:forceParams:${id}`;
const paramsKey = (id: string) => `flux:params:${id}`;

export function getForceParams(id: string): boolean {
    try {
        return localStorage.getItem(forceKey(id)) === "1";
    } catch {
        return false;
    }
}

export function setForceParams(id: string, value: boolean): void {
    try {
        if (value) localStorage.setItem(forceKey(id), "1");
        else localStorage.removeItem(forceKey(id));
    } catch {
        /* ignore */
    }
}

export function lastParamValues(id: string): Record<string, string> {
    try {
        const raw = localStorage.getItem(paramsKey(id));
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
        return {};
    }
}
