// Scoped, single-screen tutorials launched from the per-screen "?" buttons, plus
// the import+collaboration follow-up offered after the main onboarding. These
// run in whatever workspace is active (the flow and request tours first create a
// small sandbox to practise on, see data/seed.ts). Explanatory steps park their
// message in a screen corner with no dim so the screen stays fully visible.
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useAuthStoreScreen } from "@/main/features/identities/ui/useAuthStoreScreen";
import { useIdentities } from "@/main/features/identities/ui/useIdentities";
import { useSettingsScreen } from "@/main/features/settings/ui/useSettingsScreen";
import { useSwaggerImport } from "@/main/features/swagger-import/ui/useSwaggerImport";
import { ANCHORS } from "../domain/anchors";
import { elementExists } from "../domain/conditions";
import { defineTour, screen, type Tour, type TourStep } from "../domain/types";
import { makeFlowBuildSteps } from "./flow-build";
import { SAMPLE_OPENAPI } from "./sample-openapi";
import { editorReq, ensureResponseOpen, hasResponse, postBlockCount, totalBlockCount } from "./shared";

const openImportWithSample = () => {
    useSettingsScreen.getState().close();
    useSwaggerImport.getState().openWith(SAMPLE_OPENAPI);
};

// request editor: build a complete request together (no dim, never covers the
// tab body - the message sits in the lower pane while you work above)
const AUTH_TOKEN = "guide_demo_token_abc123";

export function buildRequestTour(_sandbox: { requestId: string }): Tour {
    let scriptBaseline = 0;
    let saveBaseline = 0;
    let assertBaseline = 0;

    const openTab = (key: string, title: string, body: string): TourStep => ({
        id: `req-open-${key}`,
        selector: `[data-tour="tab-${key}"]`,
        placement: "bottom",
        dim: false,
        title,
        body,
        gate: { kind: "click" },
        hint: "Click the tab to open it.",
    });

    return defineTour({
        id: "scoped-request",
        steps: [
            {
                id: "req-compose",
                anchor: ANCHORS.composeRow,
                placement: "bottom",
                dim: false,
                title: "Let's build a request",
                body: "We made a fresh Tutorial request (a POST to a demo endpoint). The method, URL and Send live here. We'll fill in the rest tab by tab.",
            },

            openTab("params", "Query parameters", "Open the Params tab."),
            {
                id: "req-params",
                anchor: ANCHORS.requestTabContent,
                placement: "bottom",
                dim: false,
                title: "Add a query parameter",
                body: "Add a query parameter. Fill both the key and the value with exactly these (copy them). It is appended to the URL as a query string - the step only advances once both match.",
                copy: [
                    { label: "key: q", value: "q" },
                    { label: "value: demo", value: "demo" },
                ],
                gate: {
                    kind: "condition",
                    check: () => !!editorReq()?.params.some((p) => p.key.trim() === "q" && p.value.trim() === "demo"),
                },
                hint: "Set a parameter with key q and value demo.",
            },

            openTab("headers", "Headers", "Open the Headers tab."),
            {
                id: "req-headers",
                anchor: ANCHORS.requestTabContent,
                placement: "bottom",
                dim: false,
                title: "Add a header",
                body: "Add a header. Fill the key and the value with exactly these. Flux suggests common header names as you type.",
                copy: [
                    { label: "key: X-Demo", value: "X-Demo" },
                    { label: "value: 1", value: "1" },
                ],
                gate: {
                    kind: "condition",
                    check: () =>
                        !!editorReq()?.headers.some((h) => h.key.trim() === "X-Demo" && h.value.trim() === "1"),
                },
                hint: "Set a header with key X-Demo and value 1.",
            },

            openTab("auth", "Authentication", "Open the Auth tab."),
            {
                id: "req-auth-type",
                anchor: ANCHORS.authType,
                placement: "bottom",
                dim: false,
                title: "Choose Bearer token",
                body: "Set the auth type to “Bearer token”. Flux will send an Authorization header for you.",
                gate: { kind: "condition", check: () => editorReq()?.auth.type === "bearer" },
                hint: "Set Auth type to “Bearer token”.",
            },
            {
                id: "req-auth-token",
                anchor: ANCHORS.authToken,
                placement: "bottom",
                dim: false,
                title: "Paste a token",
                body: "Paste this exact token into the Token field. In real life a token is usually a {{variable}} from the environment.",
                copy: [{ value: AUTH_TOKEN }],
                gate: { kind: "condition", check: () => editorReq()?.auth.token.trim() === AUTH_TOKEN },
                hint: "Paste the token into the Token field.",
            },

            openTab("inputs", "Request parameters", "Open the Inputs tab."),
            {
                id: "req-inputs",
                anchor: ANCHORS.requestTabContent,
                placement: "bottom",
                dim: false,
                title: "Declare a parameter",
                body: "Parameters are the request's own overridable variables. Click “Add parameter”, then fill the name and a default value with exactly these. We'll reference it from the body in the next step.",
                copy: [
                    { label: "name: itemName", value: "itemName" },
                    { label: "default: Widget", value: "Widget" },
                ],
                gate: {
                    kind: "condition",
                    check: () =>
                        !!editorReq()?.parameters?.some(
                            (p) => p.name.trim() === "itemName" && p.default.trim() === "Widget",
                        ),
                },
                hint: "Add a parameter named itemName with default Widget (fill both).",
            },

            openTab("body", "Request body", "Open the Body tab."),
            {
                id: "req-body",
                anchor: ANCHORS.requestTabContent,
                placement: "bottom",
                dim: false,
                title: "Use the parameter in the body",
                body: "Set the body type to JSON, then use the visual builder to add a field whose value is the parameter, written exactly as {{itemName}}. On Send, Flux substitutes the parameter's value (Widget) - that's how request parameters flow into a request. The raw JSON updates as you go.",
                copy: [
                    { label: "field: name", value: "name" },
                    { label: "value: {{itemName}}", value: "{{itemName}}" },
                ],
                gate: {
                    kind: "condition",
                    check: () => {
                        const raw = editorReq()?.body.raw ?? "";
                        return (
                            editorReq()?.body.mode === "json" && raw.includes('"name"') && raw.includes("{{itemName}}")
                        );
                    },
                },
                hint: "Switch the body to JSON and add field name = {{itemName}}.",
            },

            openTab("scripts", "Scripts", "Open the Scripts tab."),
            {
                id: "req-script",
                anchor: ANCHORS.requestTabContent,
                placement: "bottom",
                dim: false,
                title: "Add a block",
                body: "Add a block to run around the request. An Assert is a good first one. No code required.",
                gate: { kind: "condition", check: () => totalBlockCount() > scriptBaseline },
                hint: "Add a block (for example Assert).",
                onEnter: () => {
                    scriptBaseline = totalBlockCount();
                },
            },

            {
                id: "req-send",
                anchor: ANCHORS.sendButton,
                placement: "bottom",
                dim: false,
                title: "Send it",
                body: "Send the request. The demo endpoint echoes your body back, with a generated id.",
                gate: { kind: "condition", check: hasResponse },
                hint: "Click Send.",
                onEnter: ensureResponseOpen,
            },
            {
                id: "req-save-open",
                anchor: ANCHORS.responseJson,
                placement: "top",
                dim: false,
                title: "Save a value from the response",
                body: "Right-click the id in the response and choose “Save to environment”. A dialog opens.",
                gate: { kind: "condition", check: elementExists('[data-tour="save-to-env"]') },
                hint: "Right-click a value, then Save to environment.",
                onEnter: () => {
                    ensureResponseOpen();
                    saveBaseline = postBlockCount();
                },
            },
            {
                id: "req-save-dialog",
                selector: '[data-tour="save-to-env"]',
                placement: "left",
                dim: false,
                title: "Confirm the save",
                body: "Keep the suggested variable name and click Save. The value is stored now and re-captured on every send.",
                gate: { kind: "condition", check: () => postBlockCount() > saveBaseline },
                hint: "Click Save in the dialog.",
            },
            {
                id: "req-assert",
                anchor: ANCHORS.responseJson,
                placement: "top",
                dim: false,
                title: "Add a check",
                body: "Right-click a value again and choose “Add check”. That adds an assertion that runs on every future send.",
                gate: { kind: "condition", check: () => postBlockCount() > assertBaseline },
                hint: "Right-click a value, then Add check.",
                onEnter: () => {
                    assertBaseline = postBlockCount();
                },
            },
            {
                id: "req-done",
                placement: "center",
                dim: true,
                title: "A complete request 🎉",
                body: "A query param, a header, Bearer auth, a declared parameter referenced from the JSON body, a script, plus a saved value and a check. That is the full request editor in one go.",
            },
        ],
    });
}

// flows: build one from scratch on a fresh sandbox flow
export function buildFlowTour(sandbox: { requestId: string; flowId: string }): Tour {
    return defineTour({
        id: "scoped-flow",
        steps: [
            {
                id: "flow-intro",
                anchor: ANCHORS.flowSteps,
                placement: "bottom",
                title: "Let's build a flow",
                body: "We created a test request (“Get demo user”) and a fresh empty flow. A flow runs steps in order: call requests, capture values, ask for input, set variables and more. We'll add a few steps together.",
            },
            ...makeFlowBuildSteps({ requestId: sandbox.requestId, requestLabel: "Get demo user" }),
            {
                id: "flow-results",
                placement: screen.bottomRight,
                dim: false,
                title: "Run results",
                body: "Each step's result shows in the bottom panel. Expand a step to see what happened. That is a working flow.",
            },
        ],
    });
}

// auth store: create a real identity, default it, then use it on a request
const IDENTITY_NAME = "Demo identity";
const identities = () => useIdentities.getState().identities;
const namedIdentity = () => identities().find((i) => i.name.trim() === IDENTITY_NAME);

export function buildAuthStoreTour(sandbox: { requestId: string }): Tour {
    let baseline = 0;

    return defineTour({
        id: "scoped-auth-store",
        steps: [
            {
                id: "as-intro",
                placement: screen.left,
                dim: false,
                title: "Reusable identities",
                body: "The Auth store holds named credentials (Bearer, Basic, API key…) for this workspace, so you set a secret once and reuse it everywhere. Let's create one together.",
                onEnter: async () => {
                    useSettingsScreen.getState().close();
                    useSwaggerImport.getState().close();
                    useAuthStoreScreen.getState().setOpen(true);
                    // Capture the count only after the load settles, so a late-arriving
                    // fetch can't satisfy the "create" gate before the user clicks.
                    await useIdentities.getState().load();
                    baseline = identities().length;
                },
            },
            {
                id: "as-create",
                selector: '[data-tour="auth-new-identity"]',
                placement: "right",
                dim: false,
                title: "Create an identity",
                body: "Click “New identity”. A blank identity appears, selected for editing on the right.",
                gate: { kind: "condition", check: () => identities().length > baseline },
                hint: "Click “New identity”.",
            },
            {
                id: "as-configure",
                selector: '[data-tour="auth-identity-editor"]',
                placement: "left",
                dim: false,
                title: "Name it and add a secret",
                body: "Give the identity this name, set its type to “Bearer token”, and paste the token below. Fill all three exactly - the step only advances once they match.",
                copy: [
                    { label: "name: Demo identity", value: IDENTITY_NAME },
                    { label: "token", value: AUTH_TOKEN },
                ],
                gate: {
                    kind: "condition",
                    check: () => {
                        const i = namedIdentity();
                        return !!i && i.auth.type === "bearer" && i.auth.token.trim() === AUTH_TOKEN;
                    },
                },
                hint: "Name it “Demo identity”, choose Bearer token, paste the token.",
            },
            {
                id: "as-default",
                selector: '[data-tour="auth-make-default"]',
                placement: "bottom",
                dim: false,
                title: "Make it the default",
                body: "Click “Make default”. The starred identity is the one a request uses when it picks “Workspace default”.",
                gate: { kind: "condition", check: () => !!namedIdentity()?.is_default },
                hint: "Click “Make default”.",
            },
            {
                id: "as-open-auth",
                selector: '[data-tour="tab-auth"]',
                placement: "bottom",
                dim: false,
                title: "Use it on a request",
                body: "We've opened a demo request for you. Open its Auth tab.",
                gate: { kind: "click" },
                hint: "Click the Auth tab.",
                onEnter: () => {
                    useAuthStoreScreen.getState().setOpen(false);
                    useCollections.getState().select(sandbox.requestId);
                },
            },
            {
                id: "as-pick-identity",
                anchor: ANCHORS.authType,
                placement: "bottom",
                dim: false,
                title: "Choose “Stored identity”",
                body: "Set the auth type to “Stored identity”. Leave it on “Workspace default” (that's the Demo identity you just starred) or pick it by name. It is resolved fresh at send time.",
                gate: { kind: "condition", check: () => editorReq()?.auth.type === "identity" },
                hint: "Set Auth type to “Stored identity”.",
            },
            {
                id: "as-done",
                placement: "center",
                dim: true,
                title: "Identities wired up 🎉",
                body: "Rotate the secret once in the Auth store and every request that uses this identity updates at once. That's the whole point of the store.",
            },
        ],
    });
}

// import (OpenAPI / Swagger)
const importSteps: TourStep[] = [
    {
        id: "import-source",
        selector: '[data-tour="import-source"]',
        placement: "right",
        title: "Paste or fetch a spec",
        body: "We pre-filled a sample Tasks API spec for you. Normally you would paste your own OpenAPI 3.x or Swagger 2.0 here (JSON or YAML), or fetch it from a URL.",
        onEnter: openImportWithSample,
    },
    {
        id: "import-ops",
        selector: '[data-tour="import-ops"]',
        placement: "left",
        title: "Pick the operations",
        body: "Flux parsed the spec into operations grouped by tag. Tick any subset, filter by name, or use All and None. Try toggling a couple.",
    },
    {
        id: "import-dest",
        selector: '[data-tour="import-dest"]',
        placement: "right",
        title: "Destination and base URL",
        body: "Choose a target, a brand new collection or an existing one, and set the base URL (optionally as a {{baseUrl}} variable). Path params arrive as Inputs; secured endpoints get token placeholders.",
    },
    {
        id: "import-go",
        selector: '[data-tour="import-footer"]',
        placement: "top",
        title: "Import",
        body: "Hit Import and every selected operation becomes a ready-to-send request with its method, URL, query, headers and body filled in. Go ahead, or skip; it is only a sample.",
    },
];
export const importTour = defineTour({ id: "scoped-import", steps: importSteps });

// collaboration (workspace members)
const collaborationSteps: TourStep[] = [
    {
        id: "collab-intro",
        placement: screen.left,
        dim: false,
        title: "Workspaces are shared",
        body: "A workspace can have many members. Everything in it (collections, environments, the auth store) is shared with them.",
        onEnter: () => {
            useSwaggerImport.getState().close();
            useSettingsScreen.getState().show("members");
        },
    },
    {
        id: "collab-roles",
        placement: screen.left,
        dim: false,
        title: "Members and roles",
        body: "Owners can promote members to editor or owner and remove access. Editors can change content; viewers are read only.",
    },
    {
        id: "collab-invite",
        placement: screen.center,
        dim: false,
        title: "Invitations",
        body: "Invite people from the Invitations section. They get a notification and accept from the bell, then they show up here as members.",
        onEnter: () => useSettingsScreen.getState().show("invitations"),
    },
];
export const collaborationTour = defineTour({ id: "scoped-collaboration", steps: collaborationSteps });
