// Runs a user-authored script with a Postman-like `pm` API. Executes the user's
// OWN code via Function; env writes, logs and test results funnel into the
// shared EngineContext so Blocks and Code compose and report together.
import { getEnv, setEnv, type EngineContext } from "./context";

function stringify(v: unknown): string {
    if (typeof v === "string") return v;
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

// Minimal chai-like expectation used by pm.expect(...).
function expectChain(actual: unknown) {
    const j = stringify;
    const self: Record<string, unknown> = {
        equal: (e: unknown) => {
            if (actual !== e) throw new Error(`expected ${j(actual)} to equal ${j(e)}`);
            return self;
        },
        eql: (e: unknown) => {
            if (stringify(actual) !== stringify(e)) throw new Error(`expected ${j(actual)} to eql ${j(e)}`);
            return self;
        },
        include: (e: unknown) => {
            const ok =
                (typeof actual === "string" && actual.includes(String(e))) ||
                (Array.isArray(actual) && actual.includes(e));
            if (!ok) throw new Error(`expected ${j(actual)} to include ${j(e)}`);
            return self;
        },
        above: (n: number) => {
            if (!(Number(actual) > n)) throw new Error(`expected ${j(actual)} to be above ${n}`);
            return self;
        },
        below: (n: number) => {
            if (!(Number(actual) < n)) throw new Error(`expected ${j(actual)} to be below ${n}`);
            return self;
        },
        a: (t: string) => {
            const type = Array.isArray(actual) ? "array" : typeof actual;
            if (type !== t) throw new Error(`expected ${j(actual)} to be a ${t}`);
            return self;
        },
    };
    self.an = self.a;
    const identity = ["to", "be", "been", "is", "that", "and", "has", "have", "with"];
    for (const k of identity) Object.defineProperty(self, k, { get: () => self });
    Object.defineProperty(self, "exist", {
        get: () => {
            if (actual === undefined || actual === null) throw new Error("expected value to exist");
            return self;
        },
    });
    Object.defineProperty(self, "ok", {
        get: () => {
            if (!actual) throw new Error("expected value to be truthy");
            return self;
        },
    });
    Object.defineProperty(self, "true", {
        get: () => {
            if (actual !== true) throw new Error(`expected ${j(actual)} to be true`);
            return self;
        },
    });
    Object.defineProperty(self, "false", {
        get: () => {
            if (actual !== false) throw new Error(`expected ${j(actual)} to be false`);
            return self;
        },
    });
    return self;
}

export function runCode(code: string, ctx: EngineContext): void {
    if (!code.trim()) return;

    const pm = {
        response: ctx.response
            ? {
                  code: ctx.response.status,
                  status: ctx.response.statusText,
                  responseTime: ctx.response.timeMs,
                  text: () => ctx.response!.body,
                  json: () => ctx.response!.json,
                  headers: ctx.response!.headers,
              }
            : undefined,
        environment: {
            get: (key: string) => getEnv(ctx, key),
            set: (key: string, value: unknown, envId: string | null = null) =>
                setEnv(ctx, key, stringify(value), envId),
        },
        variables: {
            get: (key: string) => getEnv(ctx, key),
            set: (key: string, value: unknown) => setEnv(ctx, key, stringify(value), null),
        },
        expect: (actual: unknown) => expectChain(actual),
        test: (name: string, fn: () => void) => {
            try {
                fn();
                ctx.testResults.push({ label: name, passed: true, detail: "" });
                ctx.logs.push(`✓ ${name}`);
            } catch (e) {
                const detail = e instanceof Error ? e.message : String(e);
                ctx.testResults.push({ label: name, passed: false, detail });
                ctx.logs.push(`✕ ${name} - ${detail}`);
            }
        },
    };

    const consoleProxy = {
        log: (...args: unknown[]) => ctx.logs.push(args.map(stringify).join(" ")),
        info: (...args: unknown[]) => ctx.logs.push(args.map(stringify).join(" ")),
        warn: (...args: unknown[]) => ctx.logs.push("⚠ " + args.map(stringify).join(" ")),
        error: (...args: unknown[]) => ctx.logs.push("✕ " + args.map(stringify).join(" ")),
    };

    try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("pm", "console", code);
        fn(pm, consoleProxy);
    } catch (e) {
        ctx.logs.push(`✕ Script error: ${e instanceof Error ? e.message : String(e)}`);
    }
}
