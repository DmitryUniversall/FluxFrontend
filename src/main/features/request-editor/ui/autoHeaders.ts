// Headers Flux adds automatically (à la Postman), shown for transparency and
// distinct from the user's own. These are really sent: User-Agent/Accept are
// injected into the request (see buildOutgoing), and Host/Content-Length are
// added by the transport. A header the user sets explicitly suppresses its auto
// counterpart (mirroring real behaviour).
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import type { HttpRequest } from "../domain/models";
import { buildOutgoing, FLUX_USER_AGENT } from "../domain/use-cases";

export { FLUX_USER_AGENT };

export interface AutoHeader {
    key: string;
    value: string;
}

export function computeAutoHeaders(request: HttpRequest): AutoHeader[] {
    const resolve = useEnvironments.getState().resolve;
    const explicit = new Set(request.headers.filter((h) => h.enabled && h.key).map((h) => h.key.toLowerCase()));
    const has = (name: string) => explicit.has(name.toLowerCase());

    let outgoing: ReturnType<typeof buildOutgoing> | null = null;
    try {
        outgoing = buildOutgoing(request, resolve);
    } catch {
        outgoing = null;
    }

    let host = "";
    try {
        host = new URL(outgoing?.url ?? resolve(request.url)).host;
    } catch {
        host = "";
    }

    const out: AutoHeader[] = [];
    if (!has("host")) out.push({ key: "Host", value: host || "(from URL)" });
    if (!has("user-agent")) out.push({ key: "User-Agent", value: FLUX_USER_AGENT });
    if (!has("accept")) out.push({ key: "Accept", value: "*/*" });

    if (outgoing?.body) {
        const ct = Object.entries(outgoing.headers).find(([k]) => k.toLowerCase() === "content-type");
        if (ct && !has("content-type")) out.push({ key: "Content-Type", value: ct[1] });
        if (!has("content-length"))
            out.push({ key: "Content-Length", value: String(new TextEncoder().encode(outgoing.body).length) });
    }

    return out;
}
