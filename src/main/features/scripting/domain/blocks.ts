// Block model for the visual script builder. Blocks form a recursive tree:
// container blocks (condition, withVars) hold children. Stored opaquely on the
// request by the backend; this module owns the schema.
import type { ExprMode } from "@/core/expression";
import type { JsonPath } from "@/core/types";

export type { ExprMode };

export type BlockType = "condition" | "saveToEnv" | "setEnv" | "log" | "withVars" | "setAuth" | "assert";

export type ConditionSource = "status" | "body" | "header" | "env";
export type ConditionOp = "eq" | "neq" | "gt" | "lt" | "contains" | "exists";

interface BaseBlock {
    id: string;
    type: BlockType;
}

export interface ConditionBlock extends BaseBlock {
    type: "condition";
    source: ConditionSource;
    path: string; // body: JSON expression · header: name · env: variable
    mode: ExprMode; // for body source
    operator: ConditionOp;
    value: string;
    children: Block[];
}

export interface SaveToEnvBlock extends BaseBlock {
    type: "saveToEnv";
    pathSegments: JsonPath; // kept for back-compat (right-click capture)
    displayPath: string; // the expression
    mode: ExprMode;
    variable: string;
    envId: string | null;
}

export interface SetEnvBlock extends BaseBlock {
    type: "setEnv";
    variable: string;
    value: string;
    envId: string | null;
}

export interface LogBlock extends BaseBlock {
    type: "log";
    message: string;
}

export interface Override {
    name: string;
    value: string;
}

export interface WithVarsBlock extends BaseBlock {
    type: "withVars";
    overrides: Override[];
    children: Block[];
}

export interface AuthOverride {
    type: "none" | "bearer" | "basic" | "apikey" | "identity";
    token: string;
    username: string;
    password: string;
    key: string;
    api_key_name: string;
    add_to: "header" | "query";
    // When type === "identity": which stored identity ("" = workspace default).
    identity_id?: string;
}

export const blankAuthOverride = (): AuthOverride => ({
    type: "bearer",
    token: "",
    username: "",
    password: "",
    key: "",
    api_key_name: "",
    add_to: "header",
});

export interface SetAuthBlock extends BaseBlock {
    type: "setAuth";
    auth: AuthOverride;
}

export type AssertKind = "status" | "time" | "json" | "header" | "body";
export type AssertOp = "exists" | "eq" | "neq" | "lt" | "gt" | "contains" | "regex" | "isType";

export interface AssertBlock extends BaseBlock {
    type: "assert";
    label: string;
    onFail: "stop" | "continue";
    kind: AssertKind;
    expr: string; // json: expression · header: header name · body: text/regex
    mode: ExprMode; // json mode
    op: AssertOp; // json/header operator
    value: string; // expected / argument
}

export type Block =
    | ConditionBlock
    | SaveToEnvBlock
    | SetEnvBlock
    | LogBlock
    | WithVarsBlock
    | SetAuthBlock
    | AssertBlock;

export const CONTAINER_TYPES: BlockType[] = ["condition", "withVars"];

const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export function createBlock(type: BlockType): Block {
    switch (type) {
        case "condition":
            return {
                id: uid(),
                type,
                source: "status",
                path: "",
                mode: "path",
                operator: "eq",
                value: "200",
                children: [],
            };
        case "saveToEnv":
            return { id: uid(), type, pathSegments: [], displayPath: "", mode: "path", variable: "", envId: null };
        case "setEnv":
            return { id: uid(), type, variable: "", value: "", envId: null };
        case "log":
            return { id: uid(), type, message: "" };
        case "withVars":
            return { id: uid(), type, overrides: [{ name: "", value: "" }], children: [] };
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
    }
}

export function makeSaveToEnvBlock(
    pathSegments: JsonPath,
    displayPath: string,
    variable: string,
    envId: string | null,
    mode: ExprMode = "path",
): SaveToEnvBlock {
    return { id: uid(), type: "saveToEnv", pathSegments, displayPath, mode, variable, envId };
}

export const OPERATOR_LABELS: Record<ConditionOp, string> = {
    eq: "equals",
    neq: "not equals",
    gt: "greater than",
    lt: "less than",
    contains: "contains",
    exists: "exists",
};

export const SOURCE_LABELS: Record<ConditionSource, string> = {
    status: "status code",
    body: "body field",
    header: "header",
    env: "env variable",
};

export const ASSERT_KIND_LABELS: Record<AssertKind, string> = {
    status: "Status",
    time: "Response time",
    json: "JSON value",
    header: "Header",
    body: "Body",
};

export const ASSERT_OP_LABELS: Record<AssertOp, string> = {
    exists: "exists",
    eq: "equals",
    neq: "not equals",
    lt: "less than",
    gt: "greater than",
    contains: "contains",
    regex: "matches regex",
    isType: "is type",
};
