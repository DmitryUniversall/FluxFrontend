// "raw": value is free text (default). "selected": value is one of `options`,
// a fixed set of variants edited only in the environment modal and quick-picked
// elsewhere. Absent `type` means "raw" (back-compat with older data).
export type EnvVarType = "raw" | "selected";

export interface EnvVariable {
    key: string;
    // For "selected" vars this holds the currently-chosen option; template
    // resolution always reads `value`, so the type stays transparent to it.
    value: string;
    enabled: boolean;
    type?: EnvVarType;
    options?: string[];
}

export interface Environment {
    id: string;
    owner_id: string;
    workspace_id: string;
    name: string;
    variables: EnvVariable[];
    created_at: string;
}
