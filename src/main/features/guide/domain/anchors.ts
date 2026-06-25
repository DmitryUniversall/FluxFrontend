// Anchors are how a tour finds an element in the app. Tag the element with the
// spread helper - `<button {...tourAnchor(ANCHORS.sendButton)}>` - and reference
// the same id from a step. Centralising the ids here keeps steps and markup in
// sync and makes it obvious which elements the onboarding depends on.

export const ANCHORS = {
    // Top bar
    appLogo: "app-logo",
    envSelector: "env-selector",
    consoleButton: "console-button",
    authStoreButton: "auth-store-button",
    profileButton: "profile-button",
    helpButton: "help-button",
    // Sidebar / workspaces
    sidebar: "sidebar",
    workspaceSwitcher: "workspace-switcher",
    // Request editor
    composeRow: "compose-row",
    sendButton: "send-button",
    requestTabs: "request-tabs",
    requestTabContent: "request-tab-content",
    authType: "auth-type",
    authToken: "auth-token",
    // Response viewer
    responsePanel: "response-panel",
    responseJson: "response-json",
    // Environments
    envPanel: "env-panel",
    // Console
    consolePanel: "console-panel",
    // Flow
    flowRun: "flow-run",
    flowSteps: "flow-steps",
    flowAddStep: "flow-add-step",
} as const;

export type AnchorId = (typeof ANCHORS)[keyof typeof ANCHORS];

/** Spread onto a JSX element to make it targetable: `<div {...tourAnchor(ANCHORS.appLogo)} />`. */
export const tourAnchor = (id: AnchorId | string) => ({ "data-tour": id });

/** The CSS selector that matches an anchored element. */
export const anchorSelector = (id: AnchorId | string) => `[data-tour="${cssEscape(id)}"]`;

/** Resolve the selector a step targets (explicit `selector` wins over `anchor`). */
export const stepSelector = (step: { anchor?: string; selector?: string }): string | null =>
    step.selector ?? (step.anchor ? anchorSelector(step.anchor) : null);

// `CSS.escape` isn't typed everywhere and is overkill for our simple ids; a
// minimal escape keeps the selector valid for kebab/word ids.
function cssEscape(value: string): string {
    return value.replace(/["\\]/g, "\\$&");
}
