// Low-level HTTP client: a thin, typed wrapper over fetch with JSON handling
// and a normalized error shape. Knows nothing about auth or our endpoints -
// the one concession is an optional `onUnauthorized` hook the app layer uses to
// rotate an expired token and have the request retried once.

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export interface RequestOptions {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export type TokenProvider = () => string | null;

// Invoked on a 401. Resolves to true when the caller refreshed credentials and
// the request should be retried, false to surface the 401 as-is. Auth-specific
// logic lives in the app layer; the client stays generic.
export type UnauthorizedHandler = () => Promise<boolean>;

export class HttpClient {
    // baseUrl may be a provider so it can change at runtime (the desktop build
    // lets the user point the app at any Flux server from the sign-in screen).
    // defaultHeaders is an app-supplied provider for headers sent on every
    // request (e.g. a client-version header); kept generic here.
    constructor(
        private readonly baseUrl: string | (() => string),
        private readonly getToken: TokenProvider = () => null,
        private readonly onUnauthorized?: UnauthorizedHandler,
        private readonly defaultHeaders?: () => Record<string, string>,
    ) {}

    async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
        let res = await this.send(path, opts);

        // Likely an expired access token: let the app rotate it and retry once.
        // Retrying only once avoids a loop if the fresh token is also rejected.
        if (res.status === 401 && this.onUnauthorized && this.getToken()) {
            const refreshed = await this.onUnauthorized();
            if (refreshed) res = await this.send(path, opts);
        }

        if (res.status === 204) return undefined as T;

        const text = await res.text();
        const data = text ? safeJson(text) : undefined;

        if (!res.ok) {
            const message =
                (data && typeof data === "object" && "detail" in data
                    ? String((data as { detail: unknown }).detail)
                    : null) ??
                res.statusText ??
                "Request failed";
            throw new ApiError(res.status, message);
        }
        return data as T;
    }

    private async send(path: string, opts: RequestOptions): Promise<Response> {
        const headers: Record<string, string> = { ...this.defaultHeaders?.(), ...opts.headers };
        const token = this.getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        let body: BodyInit | undefined;
        if (opts.body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(opts.body);
        }

        const base = typeof this.baseUrl === "function" ? this.baseUrl() : this.baseUrl;
        return fetch(`${base}${path}`, {
            method: opts.method ?? "GET",
            headers,
            body,
            signal: opts.signal,
        });
    }
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
