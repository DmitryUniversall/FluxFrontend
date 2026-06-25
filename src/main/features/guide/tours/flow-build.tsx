// Shared "build a flow from scratch with the user" steps, used by both the main
// onboarding and the feature-specific flow tour. The user adds each block from
// the Add step menu (we highlight the exact menu item), then fills it in. Steps
// highlight the specific block being edited (not the whole editor) and gate on
// the EXACT expected values, so a half-typed value never advances the tour and
// the wrong request/block is rejected. Copy chips supply every value.
import { useFlowEditor } from "@/main/features/flow/ui/useFlowEditor";
import type { FlowStep } from "@/main/features/request-editor/domain/models";
import { ANCHORS } from "../domain/anchors";
import { elementExists } from "../domain/conditions";
import type { TourStep } from "../domain/types";

const steps = (): FlowStep[] => useFlowEditor.getState().flow?.flow?.steps ?? [];
const countOf = (type: FlowStep["type"]) => steps().filter((s) => s.type === type).length;
const callHasRequest = (id: string) => steps().some((s) => s.type === "call" && s.requestId === id);
const hasCapture = (variable: string, field: string) =>
    steps().some(
        (s) => s.type === "call" && s.captures.some((c) => c.variable.trim() === variable && c.expr.trim() === field),
    );
const inputDone = (variable: string, prompt: string) =>
    steps().some((s) => s.type === "input" && s.variable.trim() === variable && s.prompt.trim() === prompt);
const setEnvDone = (variable: string, value: string) =>
    steps().some((s) => s.type === "setEnv" && s.variable.trim() === variable && s.value.trim() === value);

const menuOpen = elementExists('[data-tour="flow-add-menu"]');
const RECOVER = "Added the wrong block? Remove it with the trash icon, then try again.";

const CAPTURE_VAR = "itemId";
const CAPTURE_FIELD = "id";
const INPUT_VAR = "label";
const INPUT_PROMPT = "Enter a label";
const SETENV_VAR = "last_item";
const SETENV_VALUE = "{{itemId}}";

export function makeFlowBuildSteps(opts: { requestId: string; requestLabel: string }): TourStep[] {
    const { requestId, requestLabel } = opts;
    const base = { call: 0, input: 0, setEnv: 0 };

    return [
        // Call request
        {
            id: "flow-call-open",
            anchor: ANCHORS.flowAddStep,
            placement: "right",
            title: "Add a step",
            body: "Every flow is a list of steps. Click “Add step” to open the block menu.",
            gate: { kind: "condition", check: menuOpen },
            hint: "Click “Add step”.",
            onEnter: () => {
                base.call = countOf("call");
                base.input = countOf("input");
                base.setEnv = countOf("setEnv");
            },
        },
        {
            id: "flow-call-pick",
            selector: '[data-tour="flow-add-call"]',
            placement: "right",
            title: "Pick “Call request”",
            body: `Choose “Call request”. This step sends one of your requests as part of the flow. ${RECOVER}`,
            gate: { kind: "condition", check: () => countOf("call") > base.call },
            hint: "Click “Call request” in the menu.",
        },
        {
            id: "flow-call-overview",
            selector: '[data-tour="flow-step-call"]',
            placement: "bottom",
            title: "What a Call step holds",
            body: "A Call step has three parts: the request to send, the parameters you pass to it (Arguments), and the values you capture from its response. Let's fill them in.",
        },
        {
            id: "flow-call-request",
            selector: '[data-tour="flow-step-call"]',
            placement: "bottom",
            title: "Choose the request",
            body: `Open the request dropdown and select “${requestLabel}”. Its parameters are filled in for you under “With parameters”.`,
            gate: { kind: "condition", check: () => callHasRequest(requestId) },
            hint: `Select “${requestLabel}” in the request dropdown.`,
        },
        {
            id: "flow-call-capture",
            selector: '[data-tour="flow-step-call"]',
            placement: "bottom",
            title: "Capture a value",
            body: "Under “Capture from response”, click “+ capture”. Set the variable name and the field exactly as below. That stores the response's id into the flow for later steps.",
            copy: [
                { label: "variable: itemId", value: CAPTURE_VAR },
                { label: "field: id", value: CAPTURE_FIELD },
            ],
            gate: { kind: "condition", check: () => hasCapture(CAPTURE_VAR, CAPTURE_FIELD) },
            hint: "Add a capture with variable itemId and field id.",
        },

        // Ask for input
        {
            id: "flow-input-open",
            anchor: ANCHORS.flowAddStep,
            placement: "right",
            title: "Add another step",
            body: "Now add a step that pauses for the user. Click “Add step” again.",
            gate: { kind: "condition", check: menuOpen },
            hint: "Click “Add step”.",
        },
        {
            id: "flow-input-pick",
            selector: '[data-tour="flow-add-input"]',
            placement: "right",
            title: "Pick “Ask for input”",
            body: `Choose “Ask for input”. ${RECOVER}`,
            gate: { kind: "condition", check: () => countOf("input") > base.input },
            hint: "Click “Ask for input” in the menu.",
        },
        {
            id: "flow-input-config",
            selector: '[data-tour="flow-step-input"]',
            placement: "bottom",
            title: "Set up the prompt",
            body: "Fill the Ask for input step with exactly these values. When the flow runs it pauses here and asks the user.",
            copy: [
                { label: "variable: label", value: INPUT_VAR },
                { label: "prompt: Enter a label", value: INPUT_PROMPT },
            ],
            gate: { kind: "condition", check: () => inputDone(INPUT_VAR, INPUT_PROMPT) },
            hint: "Set the variable to label and the prompt to “Enter a label”.",
        },

        // Set env variable
        {
            id: "flow-setenv-open",
            anchor: ANCHORS.flowAddStep,
            placement: "right",
            title: "One more step",
            body: "Finally, save a value to the environment. Click “Add step”.",
            gate: { kind: "condition", check: menuOpen },
            hint: "Click “Add step”.",
        },
        {
            id: "flow-setenv-pick",
            selector: '[data-tour="flow-add-setEnv"]',
            placement: "right",
            title: "Pick “Set env variable”",
            body: `Choose “Set env variable”. ${RECOVER}`,
            gate: { kind: "condition", check: () => countOf("setEnv") > base.setEnv },
            hint: "Click “Set env variable” in the menu.",
        },
        {
            id: "flow-setenv-config",
            selector: '[data-tour="flow-step-setEnv"]',
            placement: "bottom",
            title: "Save the captured value",
            body: "Fill the Set env variable step with exactly these values. It reuses what the Call step captured and writes it into the active environment.",
            copy: [
                { label: "variable: last_item", value: SETENV_VAR },
                { label: "value: {{itemId}}", value: SETENV_VALUE },
            ],
            gate: { kind: "condition", check: () => setEnvDone(SETENV_VAR, SETENV_VALUE) },
            hint: "Set the variable to last_item and the value to {{itemId}}.",
        },

        // Run
        {
            id: "flow-run",
            anchor: ANCHORS.flowRun,
            placement: "bottom",
            title: "Run your flow",
            body: "Hit Run. The flow calls the request, captures the value, then pauses for your input.",
            gate: {
                kind: "condition",
                check: () => {
                    const s = useFlowEditor.getState();
                    return !!s.pendingInput || s.results.length > 0;
                },
            },
            hint: "Click Run.",
        },
        {
            id: "flow-input-modal",
            selector: '[data-tour="flow-input"]',
            placement: "left",
            title: "Answer the prompt",
            body: "This is your Ask for input step in action. Type a value and Continue. The run finishes and the Set env variable step writes to the environment.",
            gate: {
                kind: "condition",
                check: () => {
                    const s = useFlowEditor.getState();
                    return !s.running && s.results.length > 0 && !s.pendingInput;
                },
            },
            hint: "Enter a value and click Continue.",
        },
    ];
}
