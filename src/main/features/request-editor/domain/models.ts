// Request model - mirrors the backend shape. Script payloads reuse the Block
// type from the scripting feature; the backend persists them opaquely.
import type { ExprMode } from "@/core/expression";
import type { AssertKind, AssertOp, AuthOverride, Block } from "@/main/features/scripting/domain/blocks";

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export interface KeyValue {
    key: string;
    value: string;
    enabled: boolean;
    // When false, the pair is dropped if its (resolved) value is empty. Optional:
    // absent means "always send" (back-compat).
    send_empty?: boolean;
}

export type AuthType = "none" | "bearer" | "basic" | "apikey" | "identity" | "parameter";

export interface Auth {
    type: AuthType;
    token: string;
    username: string;
    password: string;
    key: string;
    api_key_name: string;
    add_to: "header" | "query";
    // When type === "identity": which stored identity to use ("" = workspace default).
    identity_id?: string;
}

export type BodyMode = "none" | "json" | "text" | "form";

export interface Body {
    mode: BodyMode;
    raw: string;
    form: KeyValue[];
}

export interface ScriptStage {
    blocks: Block[];
    code: string;
}

export interface Scripts {
    pre: ScriptStage;
    post: ScriptStage;
}

export interface RequestParam {
    name: string;
    default: string; // may contain {{}} and {{$dynamic}}
    required: boolean;
    description: string;
    // Preset variant values offered for quick selection (run form / flow calls).
    // Empty/absent = free-text input only.
    options?: string[];
}

// New parameters are required by default; giving one a default value flips it to
// optional (see the Inputs tab).
export const emptyParam = (): RequestParam => ({ name: "", default: "", required: true, description: "" });

// ---- Flow (orchestrator) ----
export type RequestKind = "http" | "flow";
export type FlowStepType =
    | "call"
    | "set"
    | "setEnv"
    | "input"
    | "delay"
    | "setAuth"
    | "assert"
    | "wait"
    | "forEach"
    | "if";

export interface CallArg {
    name: string;
    value: string;
}
export interface Capture {
    variable: string;
    expr: string;
    mode: ExprMode;
}
export interface CallStep {
    id: string;
    type: "call";
    requestId: string; // live link to an http request
    args: CallArg[]; // invocation parameters
    captures: Capture[]; // var <- expression(response)
    // Optional auth for this call only. Absent = inherit (the active Set-auth, or
    // the request's own auth). Lets one flow run a base request as a specific
    // identity without re-declaring the whole auth elsewhere.
    auth?: AuthOverride;
}
export interface SetStep {
    id: string;
    type: "set";
    variable: string;
    value: string;
}
export interface SetEnvStep {
    id: string;
    type: "setEnv";
    variable: string;
    value: string;
    envId: string | null;
}
export interface InputStep {
    id: string;
    type: "input";
    variable: string; // flow var the entered value is stored in
    prompt: string; // message shown to the user when the flow pauses
    defaultValue: string; // pre-filled value (supports {{var}})
    secret: boolean; // mask the field (codes, passwords)
}
export interface DelayStep {
    id: string;
    type: "delay";
    ms: number;
}
export interface SetAuthStep {
    id: string;
    type: "setAuth";
    auth: AuthOverride;
}
export interface AssertStep {
    id: string;
    type: "assert";
    label: string;
    onFail: "stop" | "continue";
    kind: AssertKind;
    expr: string;
    mode: ExprMode;
    op: AssertOp;
    value: string;
}
export interface WaitStep {
    id: string;
    type: "wait";
    requestId: string; // request to poll (live link)
    args: CallArg[];
    intervalMs: number; // delay between attempts
    maxAttempts: number; // cap on attempts
    timeoutMs: number; // hard wall-clock limit
    // "until" condition (reuses the assert machinery): polling stops once it holds
    kind: AssertKind;
    expr: string;
    mode: ExprMode;
    op: AssertOp;
    value: string;
    captures: Capture[]; // captured from the final (successful) response
    onFail: "stop" | "continue"; // when it times out without the condition holding
}
export interface ForEachStep {
    id: string;
    type: "forEach";
    expr: string; // expression yielding an array (over the last response)
    mode: ExprMode;
    itemVar: string; // flow var set to each element
    indexVar: string; // optional flow var set to the index
    children: FlowStep[];
}
export interface IfStep {
    id: string;
    type: "if";
    // condition over the last response (reuses the assert machinery)
    kind: AssertKind;
    expr: string;
    mode: ExprMode;
    op: AssertOp;
    value: string;
    children: FlowStep[];
}
export type FlowStep =
    | CallStep
    | SetStep
    | SetEnvStep
    | InputStep
    | DelayStep
    | SetAuthStep
    | AssertStep
    | WaitStep
    | ForEachStep
    | IfStep;
export interface FlowDoc {
    steps: FlowStep[];
}

export interface HttpRequest {
    id: string;
    collection_id: string;
    owner_id: string;
    kind: RequestKind;
    name: string;
    method: Method;
    url: string;
    params: KeyValue[];
    headers: KeyValue[];
    auth: Auth;
    body: Body;
    parameters: RequestParam[];
    scripts: Scripts;
    flow: FlowDoc;
    created_at: string;
    updated_at: string;
}

export interface OutgoingRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
}

export interface ProxyResponse {
    status: number;
    status_text: string;
    headers: Record<string, string>;
    body: string;
    time_ms: number;
    size_bytes: number;
}

export const emptyKeyValue = (): KeyValue => ({ key: "", value: "", enabled: true });
