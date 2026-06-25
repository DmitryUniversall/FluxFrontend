// Creates the "Onboarding Guide" workspace and pre-seeds it with sample
// requests, an environment (with {{base_url}}) and a demo flow, so the user has
// something real to practise on without typing a single URL.
//
// Seeding is scoped to the new workspace via `workspaceContext`, then the
// workspace is switched in last - so the shell's reload sees the seeded content
// rather than racing an empty fetch.
import { serverConfig } from "@/main/common/api/server-config";
import { workspaceContext } from "@/main/common/api/workspace-context";
import { collectionsRepository } from "@/main/features/collections/data/collections-repository";
import { environmentsRepository } from "@/main/features/environments/data/environments-repository";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useSidebarState } from "@/main/features/collections/ui/useSidebarState";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { requestsRepository } from "@/main/features/request-editor/data/requests-repository";
import type { Body, FlowStep, HttpRequest, RequestParam } from "@/main/features/request-editor/domain/models";
import { useWorkspaces } from "@/main/features/workspaces/ui/useWorkspaces";
import { workspacesRepository } from "@/main/features/workspaces/data/workspaces-repository";

export interface SeedResult {
    workspaceId: string;
    collectionId: string;
    envId: string;
    requests: { ping: string; echo: string; getUser: string; login: string };
    flowId: string;
}

const BASE = "{{base_url}}/api/v2/guide";

const jsonBody = (raw: string): Body => ({ mode: "json", raw, form: [] });

/** A fresh, unique workspace name so re-runs don't collide. */
function uniqueName(): string {
    const base = "Onboarding Guide";
    const taken = useWorkspaces
        .getState()
        .workspaces.filter((w) => w.name === base || w.name.startsWith(`${base} `)).length;
    return taken === 0 ? base : `${base} ${taken + 1}`;
}

/** Create a request in the collection, then overwrite it with our seed fields. */
async function seedRequest(
    collectionId: string,
    patch: Partial<HttpRequest> & { name: string; method: string },
): Promise<string> {
    const summary = await collectionsRepository.createRequest(collectionId, patch.name, patch.method, "http");
    const full = await requestsRepository.get(summary.id);
    await requestsRepository.save({ ...full, ...patch });
    return summary.id;
}

export async function createOnboardingWorkspace(): Promise<SeedResult> {
    const ws = await workspacesRepository.create(uniqueName());
    // Scope every seed write to the new workspace before switching to it.
    workspaceContext.set(ws.id);

    // Environment: {{base_url}} points at this very backend, so practice requests
    // resolve to the /api/v2/guide/* sandbox.
    const env = await environmentsRepository.create("Guide");
    await environmentsRepository.update({
        ...env,
        variables: [{ key: "base_url", value: serverConfig.baseUrl(), enabled: true }],
    });

    const col = await collectionsRepository.createCollection("Guide requests");

    const ping = await seedRequest(col.id, {
        name: "1 · Ping",
        method: "GET",
        url: `${BASE}/ping`,
    });

    const echo = await seedRequest(col.id, {
        name: "2 · Create item",
        method: "POST",
        url: `${BASE}/echo`,
        body: jsonBody('{\n  "name": "Widget",\n  "qty": 3\n}'),
    });

    const userParam: RequestParam = {
        name: "userId",
        default: "",
        required: true,
        description: "Which user to fetch",
        options: ["u_1", "u_2", "u_3"],
    };
    const getUser = await seedRequest(col.id, {
        name: "3 · Get user by id",
        method: "GET",
        url: `${BASE}/users/{{userId}}`,
        parameters: [userParam],
    });

    const login = await seedRequest(col.id, {
        name: "4 · Login",
        method: "POST",
        url: `${BASE}/login`,
        body: jsonBody('{\n  "username": "demo",\n  "password": "secret"\n}'),
    });

    const flowId = await seedFlow(col.id);

    // Now publish + switch: the store learns about the workspace, then activating
    // it triggers the shell's reload, which sees the seeded collection/env.
    await useWorkspaces.getState().load();
    useWorkspaces.getState().setActive(ws.id);
    await useCollections.getState().load();
    await useEnvironments.getState().load();
    const guideEnv = useEnvironments.getState().environments.find((e) => e.id === env.id);
    if (guideEnv) useEnvironments.getState().setActive(guideEnv.id);
    // Open the collection so its requests are visible for the tour to point at.
    useSidebarState.getState().expand(col.id);

    return {
        workspaceId: ws.id,
        collectionId: col.id,
        envId: env.id,
        requests: { ping, echo, getUser, login },
        flowId,
    };
}

/** An empty flow - the onboarding builds it from scratch together with the user. */
async function seedFlow(collectionId: string, name = "5 · Demo flow"): Promise<string> {
    const summary = await collectionsRepository.createRequest(collectionId, name, "GET", "flow");
    const full = await requestsRepository.get(summary.id);
    const steps: FlowStep[] = [];
    await requestsRepository.save({ ...full, flow: { steps } });
    return summary.id;
}

// Sandboxes for the feature tours (run in the CURRENT workspace)
// They reuse a single "Guide tutorials" collection so they don't clutter the
// tree, but create fresh requests/flows to practise on.

const ABS = (path: string) => `${serverConfig.baseUrl()}${path}`;

/** Find or create the shared tutorials collection in the active workspace. */
async function ensureGuideCollection(): Promise<string> {
    await useCollections.getState().load();
    const existing = useCollections.getState().tree.find((c) => c.name === "Guide tutorials");
    if (existing) return existing.id;
    const col = await collectionsRepository.createCollection("Guide tutorials");
    return col.id;
}

/** A test request the flow tour can call, plus a fresh empty flow to build. */
export async function createFlowSandbox(): Promise<{ requestId: string; flowId: string }> {
    const collectionId = await ensureGuideCollection();
    const requestId = await seedRequest(collectionId, {
        name: "Get demo user",
        method: "GET",
        url: ABS("/api/v2/guide/users/{{userId}}"),
        parameters: [
            {
                name: "userId",
                default: "u_1",
                required: true,
                description: "Which user to fetch",
                options: ["u_1", "u_2", "u_3"],
            },
        ],
    });
    const flowId = await seedFlow(collectionId, "My first flow");
    await useCollections.getState().load();
    useSidebarState.getState().expand(collectionId);
    useCollections.getState().select(flowId);
    return { requestId, flowId };
}

/** A simple request the auth-store tour switches to after creating an identity. */
export async function createAuthStoreSandbox(): Promise<{ requestId: string }> {
    const collectionId = await ensureGuideCollection();
    const requestId = await seedRequest(collectionId, {
        name: "Auth demo request",
        method: "GET",
        url: ABS("/api/v2/guide/ping"),
    });
    await useCollections.getState().load();
    useSidebarState.getState().expand(collectionId);
    return { requestId };
}

/** A fresh, mostly empty request for the "build a complex request" tour. */
export async function createRequestSandbox(): Promise<{ requestId: string }> {
    const collectionId = await ensureGuideCollection();
    const requestId = await seedRequest(collectionId, {
        name: "Tutorial request",
        method: "POST",
        url: ABS("/api/v2/guide/echo"),
    });
    await useCollections.getState().load();
    useSidebarState.getState().expand(collectionId);
    useCollections.getState().select(requestId);
    return { requestId };
}
