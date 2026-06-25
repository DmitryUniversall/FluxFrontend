// The main onboarding tour. Built from a freshly-seeded "Onboarding Guide"
// workspace (see data/seed.ts), so every step has real, pre-filled content to
// act on (the user never types a URL). The user drives navigation themselves
// (we highlight the next request in the sidebar and wait for them to open it),
// steps gate on real app state, short "now let's..." transitions link the
// sections, and the console is closed when the tour ends.
import { useLayout } from "@/main/common/ui/useLayout";
import { useCollections } from "@/main/features/collections/ui/useCollections";
import { useSidebarState } from "@/main/features/collections/ui/useSidebarState";
import { useEnvironments } from "@/main/features/environments/ui/useEnvironments";
import { useRequestConsole } from "@/main/features/console/ui/useRequestConsole";
import { useRequestEditor } from "@/main/features/request-editor/ui/useRequestEditor";
import { ANCHORS } from "../domain/anchors";
import { elementExists } from "../domain/conditions";
import { defineTour, type Tour, type TourStep } from "../domain/types";
import { makeFlowBuildSteps } from "./flow-build";
import type { SeedResult } from "../data/seed";

const AUTH_TOKEN = "guide_demo_token_abc123";

// small helpers shared by the steps
const editorReq = () => useRequestEditor.getState().request;
const hasResponse = () => !!useRequestEditor.getState().response;
const postBlockCount = () => editorReq()?.scripts.post.blocks.length ?? 0;
const totalBlockCount = () => {
    const s = editorReq()?.scripts;
    return (s?.pre.blocks.length ?? 0) + (s?.post.blocks.length ?? 0);
};
const ensureResponseOpen = () => {
    if (useLayout.getState().responseCollapsed) useLayout.getState().toggleResponse();
};
const ensureVarsOpen = () => {
    if (useLayout.getState().varsCollapsed) useLayout.getState().toggleVars();
};
const ensureSidebarOpen = () => {
    if (useLayout.getState().sidebarCollapsed) useLayout.getState().toggleSidebar();
};

export function buildMainTour(seed: SeedResult, hooks: { onComplete?: () => void; onSkip?: () => void } = {}): Tour {
    // Captured per-run so "did the user add a block?" comparisons start clean.
    let blocksBaseline = 0;

    // A step that asks the user to open a specific request from the sidebar (we
    // highlight it and wait for them to click it, so they navigate, not us).
    const openRequest = (id: string, title: string, body: TourStep["body"]): TourStep => ({
        id: `open-${id}`,
        selector: `[data-tour="req-${id}"]`,
        placement: "right",
        title,
        body,
        gate: { kind: "condition", check: () => useCollections.getState().selectedRequestId === id },
        hint: "Click it in the sidebar to open it.",
        onEnter: () => {
            ensureSidebarOpen();
            useSidebarState.getState().expand(seed.collectionId);
        },
    });

    const steps: TourStep[] = [
        {
            id: "welcome",
            placement: "center",
            dim: true,
            title: "Welcome to Flux 👋",
            body: (
                <>
                    We created a sample <b>Onboarding Guide</b> workspace with a few ready requests and an empty flow.
                    We will walk through the essentials together. It takes about five minutes, and you can stop any time
                    with the ✕.
                </>
            ),
        },
        {
            id: "sidebar",
            anchor: ANCHORS.sidebar,
            placement: "right",
            title: "Your collections",
            body: "Requests and flows live here, grouped into collections. We added a “Guide requests” collection to practise with. You will open each item yourself as we go.",
            onEnter: () => {
                ensureSidebarOpen();
                useSidebarState.getState().expand(seed.collectionId);
            },
        },

        // 1 · simple send
        openRequest(
            seed.requests.ping,
            "Open your first request",
            "Let's start simple. Click “1 · Ping” in the sidebar.",
        ),
        {
            id: "send-ping",
            anchor: ANCHORS.sendButton,
            placement: "bottom",
            title: "Send it",
            body: "It is already filled in: method, URL, everything. Just hit Send.",
            gate: { kind: "condition", check: hasResponse },
            hint: "Click Send (the request is ready to go).",
            onEnter: ensureResponseOpen,
        },
        {
            id: "response",
            anchor: ANCHORS.responsePanel,
            placement: "top",
            title: "The response",
            body: "Status, timing and size up top; the body below. JSON gets a collapsible tree, handy for what comes next.",
            onEnter: ensureResponseOpen,
        },

        // 2 · JSON body + quick actions
        openRequest(
            seed.requests.echo,
            "Now let's edit a body",
            "Next up: sending a JSON body. Open “2 · Create item”.",
        ),
        {
            id: "open-body",
            selector: '[data-tour="tab-body"]',
            placement: "bottom",
            title: "The Body tab",
            body: "This request sends JSON. Open the Body tab.",
            gate: { kind: "click" },
            hint: "Click the Body tab.",
        },
        {
            id: "body-builder",
            anchor: ANCHORS.requestTabContent,
            placement: "bottom",
            title: "Raw or builder",
            body: "Edit JSON as text, or switch to the visual builder to add and rename fields without worrying about commas. Tweak a value if you like.",
        },
        {
            id: "send-echo",
            anchor: ANCHORS.sendButton,
            placement: "bottom",
            title: "Send it",
            body: "The echo endpoint replies with what you sent, plus a generated id we will use in a second.",
            gate: { kind: "condition", check: hasResponse },
            hint: "Click Send.",
            onEnter: ensureResponseOpen,
        },
        {
            id: "ctx-check",
            anchor: ANCHORS.responseJson,
            placement: "left",
            title: "Right-click for quick actions",
            body: "Right-click the id field in the response and choose “Add check”. It drops an assert into Post-response scripts.",
            gate: { kind: "condition", check: () => postBlockCount() > blocksBaseline },
            hint: "Right-click a value, then Add check.",
            onEnter: () => {
                ensureResponseOpen();
                blocksBaseline = postBlockCount();
            },
        },
        {
            id: "ctx-save",
            anchor: ANCHORS.responseJson,
            placement: "left",
            title: "Save a value to the environment",
            body: "Right-click the id again and choose “Save to environment…”.",
            gate: { kind: "condition", check: elementExists('[data-tour="save-to-env"]') },
            hint: "Right-click a value, then Save to environment.",
        },
        {
            id: "save-dialog",
            selector: '[data-tour="save-to-env"]',
            placement: "left",
            title: "Name it and save",
            body: "Keep the suggested name (or change it) and hit Save. It is written to the active environment now and re-captured on every send.",
            gate: {
                kind: "condition",
                check: () => {
                    const env = useEnvironments.getState().getActive();
                    return !!env && env.variables.some((v) => v.key.trim() && v.key !== "base_url");
                },
            },
            hint: "Click Save in the dialog.",
        },
        {
            id: "env-panel",
            anchor: ANCHORS.envPanel,
            placement: "right",
            title: "Environment variables",
            body: (
                <>
                    There it is. This panel always shows the active environment's variables.{" "}
                    <code className="mono">{"{{base_url}}"}</code> is why you never typed a URL, and your saved value
                    sits right alongside it. Anything written as <code className="mono">{"{{like_this}}"}</code>{" "}
                    resolves from here.
                </>
            ),
            onEnter: ensureVarsOpen,
        },

        // 3 · parameters + run prompt
        openRequest(
            seed.requests.getUser,
            "Now let's try parameters",
            "Open “3 · Get user by id”. It has a parameter baked into its URL.",
        ),
        {
            id: "param-send",
            anchor: ANCHORS.sendButton,
            placement: "bottom",
            title: "Parameters and the run prompt",
            body: "Its URL contains a required userId. Hit Send and Flux asks you for the value first.",
            gate: { kind: "condition", check: elementExists('[data-tour="run-params"]') },
            hint: "Click Send.",
        },
        {
            id: "param-fill",
            selector: '[data-tour="run-params"]',
            placement: "left",
            title: "Fill the parameter",
            body: "Pick (or paste) a user id, then Send. The value is dropped into the URL before the request goes out.",
            copy: [{ value: "u_1" }],
            gate: { kind: "condition", check: hasResponse },
            hint: "Paste u_1 (or pick a chip) and click Send.",
            onEnter: ensureResponseOpen,
        },

        // 4 · auth
        openRequest(seed.requests.login, "Now let's secure a request", "Open “4 · Login” to set up authentication."),
        {
            id: "open-auth",
            selector: '[data-tour="tab-auth"]',
            placement: "bottom",
            title: "The Auth tab",
            body: "Open the Auth tab.",
            gate: { kind: "click" },
            hint: "Click the Auth tab.",
        },
        {
            id: "auth-type",
            anchor: ANCHORS.authType,
            placement: "bottom",
            title: "1. Pick an auth type",
            body: "Flux supports Bearer, Basic, API key and more. Choose “Bearer token” from the dropdown.",
            gate: { kind: "condition", check: () => editorReq()?.auth.type === "bearer" },
            hint: "Set Auth type to “Bearer token”.",
        },
        {
            id: "auth-token",
            anchor: ANCHORS.authToken,
            placement: "bottom",
            title: "Paste the token",
            body: "Paste this exact token into the Token field. (A token is usually itself a {{variable}} from the environment.)",
            copy: [{ value: AUTH_TOKEN }],
            gate: { kind: "condition", check: () => editorReq()?.auth.token.trim() === AUTH_TOKEN },
            hint: "Paste the token into the Token field.",
        },
        {
            id: "auth-more",
            anchor: ANCHORS.authStoreButton,
            placement: "bottom",
            title: "2. Ask on run. 3. Saved identities",
            body: (
                <>
                    Two more options worth knowing. <b>“Ask on run”</b> prompts for auth at send time (nothing is stored
                    on the request). <b>“Stored identity”</b> reuses a credential from the workspace <b>Auth store</b>,
                    this button. It has its own “?” tutorial when you are ready.
                </>
            ),
        },

        // 5 · block scripts
        {
            id: "open-scripts",
            selector: '[data-tour="tab-scripts"]',
            placement: "bottom",
            title: "Now let's add a script",
            body: "Open the Scripts tab. You can build pre and post logic from blocks, no code required.",
            gate: { kind: "click" },
            hint: "Click the Scripts tab.",
        },
        {
            id: "scripts-add",
            anchor: ANCHORS.requestTabContent,
            placement: "bottom",
            title: "Add a block",
            body: "Add any block. An Assert is a good first one. Blocks run top to bottom around the request.",
            gate: { kind: "condition", check: () => totalBlockCount() > blocksBaseline },
            hint: "Add a block (for example Assert) from the Scripts tab.",
            onEnter: () => {
                blocksBaseline = totalBlockCount();
            },
        },

        // 6 · flows (built from scratch)
        openRequest(
            seed.flowId,
            "Now let's build a flow",
            "Open “5 · Demo flow”. It is empty, so we will build it together.",
        ),
        {
            id: "flow-intro",
            anchor: ANCHORS.flowSteps,
            placement: "bottom",
            title: "What flows do",
            body: "A flow chains steps. It can call requests, capture values from responses, ask you for input, set variables and more. Let's build one.",
        },
        ...makeFlowBuildSteps({ requestId: seed.requests.echo, requestLabel: "2 · Create item" }),

        // 7 · console
        {
            id: "console",
            anchor: ANCHORS.consoleButton,
            placement: "bottom",
            title: "Now the request console",
            body: "Every request and flow call is logged here. Open it.",
            gate: { kind: "condition", check: () => useRequestConsole.getState().open },
            hint: "Click the console button.",
        },
        {
            id: "console-panel",
            anchor: ANCHORS.consolePanel,
            placement: "top",
            title: "Full request history",
            body: "Expand any row to inspect headers and bodies for both sides. Filter by method, URL or status. We will close it when we are done.",
        },

        // 8 · workspaces
        {
            id: "workspace-switch",
            anchor: ANCHORS.workspaceSwitcher,
            placement: "right",
            title: "Finally, workspaces",
            body: "This is the workspace you are in now. Each workspace is a self-contained space with its own collections, environments and auth store.",
        },
        {
            id: "workspace-create",
            anchor: ANCHORS.workspaceSwitcher,
            placement: "right",
            title: "Switch and create",
            body: "Open this menu to switch workspaces or create a new one. Handy for separating projects (Dev vs Prod) or clients. Each onboarding replay makes a fresh one.",
        },
        {
            id: "workspace-share",
            anchor: ANCHORS.workspaceSwitcher,
            placement: "right",
            title: "Personal vs shared",
            body: (
                <>
                    Your <b>personal</b> workspace is private to you. Any other workspace can be <b>shared</b>: invite
                    teammates and give them roles (owner, editor, viewer) from <b>Workspace settings</b>. There is a
                    dedicated collaboration tutorial in the “?” menu.
                </>
            ),
        },
        {
            id: "help",
            anchor: ANCHORS.helpButton,
            placement: "bottom",
            title: "That's the tour! 🎉",
            body: (
                <>
                    This <b>?</b> button has the documentation and replays onboarding any time. Individual screens (Auth
                    store, Import, Flows and more) have their own <b>?</b> for focused tutorials. Happy testing!
                </>
            ),
        },
    ];

    // Tidy up when the tour ends either way: the console we opened should not
    // linger after the first run.
    const cleanup = () => useRequestConsole.getState().setOpen(false);

    return defineTour({
        id: "onboarding-main",
        title: "Flux onboarding",
        steps,
        onComplete: () => {
            cleanup();
            hooks.onComplete?.();
        },
        onSkip: () => {
            cleanup();
            hooks.onSkip?.();
        },
    });
}
