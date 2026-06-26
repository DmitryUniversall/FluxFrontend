// In-memory seed content for the landing-page demos. Mirrors the onboarding
// sandbox (see guide/data/seed.ts) but as plain objects - no backend writes, no
// workspace, no auth. The demos send through the public preview proxy, which is
// locked to the /api/v2/guide/* sandbox these requests target.
import { serverConfig } from "@/main/common/api/server-config";
import type { Environment } from "@/main/features/environments/domain/models";
import type {
    Auth,
    Body,
    FlowStep,
    HttpRequest,
    Method,
    RequestParam,
    Scripts,
} from "@/main/features/request-editor/domain/models";
import { blankAuthOverride } from "@/main/features/scripting/domain/blocks";

const NOW = "2024-01-01T00:00:00Z";
const DEMO_OWNER = "demo";
const DEMO_COLLECTION = "demo-collection";
const DEMO_WORKSPACE = "demo-workspace";

const noAuth = (): Auth => ({
    type: "none",
    token: "",
    username: "",
    password: "",
    key: "",
    api_key_name: "",
    add_to: "header",
});
const noBody = (): Body => ({ mode: "none", raw: "", form: [] });
const jsonBody = (raw: string): Body => ({ mode: "json", raw, form: [] });
const emptyScripts = (): Scripts => ({ pre: { blocks: [], code: "" }, post: { blocks: [], code: "" } });

function makeRequest(
    p: Partial<HttpRequest> & { id: string; name: string; method: Method; url: string },
): HttpRequest {
    return {
        id: p.id,
        collection_id: DEMO_COLLECTION,
        owner_id: DEMO_OWNER,
        kind: "http",
        name: p.name,
        method: p.method,
        url: p.url,
        params: p.params ?? [],
        headers: p.headers ?? [],
        auth: p.auth ?? noAuth(),
        body: p.body ?? noBody(),
        parameters: p.parameters ?? [],
        scripts: p.scripts ?? emptyScripts(),
        flow: p.flow ?? { steps: [] },
        created_at: NOW,
        updated_at: NOW,
    };
}

// {{base_url}} resolves to this backend, so the demo requests hit the guide
// sandbox. The variable is intentionally left as a template so the demo shows
// off live variable resolution + highlighting.
const BASE = "{{base_url}}/api/v2/guide";

export const DEMO_REQUEST_IDS = {
    ping: "demo-req-ping",
    echo: "demo-req-echo",
    getUser: "demo-req-get-user",
    login: "demo-req-login",
} as const;

const userParam: RequestParam = {
    name: "userId",
    default: "u_1",
    required: true,
    description: "Which user to fetch",
    options: ["u_1", "u_2", "u_3"],
};

export const demoRequests: Record<string, HttpRequest> = {
    [DEMO_REQUEST_IDS.ping]: makeRequest({
        id: DEMO_REQUEST_IDS.ping,
        name: "Ping",
        method: "GET",
        url: `${BASE}/ping`,
    }),
    [DEMO_REQUEST_IDS.echo]: makeRequest({
        id: DEMO_REQUEST_IDS.echo,
        name: "Create item",
        method: "POST",
        url: `${BASE}/echo`,
        body: jsonBody('{\n  "name": "Widget",\n  "qty": 3\n}'),
    }),
    [DEMO_REQUEST_IDS.getUser]: makeRequest({
        id: DEMO_REQUEST_IDS.getUser,
        name: "Get user by id",
        method: "GET",
        url: `${BASE}/users/{{userId}}`,
        parameters: [userParam],
    }),
    [DEMO_REQUEST_IDS.login]: makeRequest({
        id: DEMO_REQUEST_IDS.login,
        name: "Login",
        method: "POST",
        url: `${BASE}/login`,
        body: jsonBody('{\n  "username": "demo",\n  "password": "secret"\n}'),
    }),
};

// Quick-pick order for the buttons above the request demo.
export const demoRequestOrder: string[] = [
    DEMO_REQUEST_IDS.ping,
    DEMO_REQUEST_IDS.echo,
    DEMO_REQUEST_IDS.getUser,
    DEMO_REQUEST_IDS.login,
];

export const DEMO_ENV_ID = "demo-env";

/** A fresh demo environment (base_url -> this backend). */
export function demoEnvironment(): Environment {
    return {
        id: DEMO_ENV_ID,
        owner_id: DEMO_OWNER,
        workspace_id: DEMO_WORKSPACE,
        name: "Demo",
        variables: [{ key: "base_url", value: serverConfig.baseUrl(), enabled: true }],
        created_at: NOW,
    };
}

/**
 * The "run & watch" flow: log in, capture the token, fetch a user as Bearer,
 * then assert the call succeeded. Showcases chaining, variable capture and auth.
 */
export function demoFlowSteps(): FlowStep[] {
    return [
        {
            id: "demo-step-login",
            type: "call",
            requestId: DEMO_REQUEST_IDS.login,
            args: [],
            captures: [{ variable: "token", expr: "token", mode: "path" }],
        },
        {
            id: "demo-step-get-user",
            type: "call",
            requestId: DEMO_REQUEST_IDS.getUser,
            args: [{ name: "userId", value: "u_1" }],
            captures: [{ variable: "userName", expr: "name", mode: "path" }],
            auth: { ...blankAuthOverride(), type: "bearer", token: "{{token}}" },
        },
        {
            id: "demo-step-assert",
            type: "assert",
            label: "Response is 200 OK",
            onFail: "stop",
            kind: "status",
            expr: "",
            mode: "path",
            op: "eq",
            value: "200",
        },
    ];
}
