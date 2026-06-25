// Default constructors for flow steps.
import { blankAuthOverride } from "@/main/features/scripting/domain/blocks";
import type { FlowStep, FlowStepType } from "@/main/features/request-editor/domain/models";
const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export function createFlowStep(type: FlowStepType): FlowStep {
    switch (type) {
        case "call":
            return { id: uid(), type, requestId: "", args: [], captures: [] };
        case "set":
            return { id: uid(), type, variable: "", value: "" };
        case "setEnv":
            return { id: uid(), type, variable: "", value: "", envId: null };
        case "input":
            return { id: uid(), type, variable: "", prompt: "", defaultValue: "", secret: false };
        case "delay":
            return { id: uid(), type, ms: 1000 };
        case "setAuth":
            return { id: uid(), type, auth: blankAuthOverride() };
        case "assert":
            return {
                id: uid(),
                type,
                label: "",
                onFail: "stop",
                kind: "status",
                expr: "",
                mode: "path",
                op: "eq",
                value: "200",
            };
        case "wait":
            return {
                id: uid(),
                type,
                requestId: "",
                args: [],
                intervalMs: 3000,
                maxAttempts: 20,
                timeoutMs: 120000,
                kind: "json",
                expr: "",
                mode: "path",
                op: "exists",
                value: "",
                captures: [],
                onFail: "stop",
            };
        case "forEach":
            return { id: uid(), type, expr: "", mode: "path", itemVar: "item", indexVar: "", children: [] };
        case "if":
            return { id: uid(), type, kind: "json", expr: "", mode: "path", op: "exists", value: "", children: [] };
    }
}

export const STEP_LABELS: Record<FlowStepType, string> = {
    call: "Call request",
    set: "Set variable",
    setEnv: "Set env variable",
    input: "Ask for input",
    delay: "Delay",
    setAuth: "Set auth",
    assert: "Assert",
    wait: "Wait / Poll",
    forEach: "For each",
    if: "If",
};

export const CONTAINER_STEP_TYPES: FlowStepType[] = ["forEach", "if"];

// Every flow-scope variable a flow defines: Set/Set-env/Input targets, Call/Wait
// captures, and forEach item/index vars - gathered recursively through if/forEach
// containers. Feeds the flow editor's {{template}} highlighting + autocomplete so
// these read as flow-locals (green) rather than unknown.
export function collectFlowVarNames(steps: FlowStep[]): string[] {
    const names = new Set<string>();
    const add = (n: string | undefined) => {
        const t = (n ?? "").trim();
        if (t) names.add(t);
    };
    const visit = (list: FlowStep[]) => {
        for (const s of list) {
            switch (s.type) {
                case "set":
                case "setEnv":
                case "input":
                    add(s.variable);
                    break;
                case "call":
                case "wait":
                    for (const c of s.captures) add(c.variable);
                    break;
                case "forEach":
                    add(s.itemVar);
                    add(s.indexVar);
                    visit(s.children);
                    break;
                case "if":
                    visit(s.children);
                    break;
            }
        }
    };
    visit(steps);
    return Array.from(names).sort();
}
