// A single entry in the request console - one proxied request and its outcome
// (a response, or an error). Captures enough to inspect the exchange after the
// fact, like Postman's console.
export interface ConsoleEntry {
    id: string;
    at: number; // epoch ms when the request started
    method: string;
    url: string;
    requestHeaders: Record<string, string>;
    requestBody: string | null;
    durationMs: number; // client-measured round trip
    // present on a completed response
    status?: number;
    statusText?: string;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
    timeMs?: number; // server-reported time
    sizeBytes?: number;
    // present when the request never completed
    error?: string;
}
