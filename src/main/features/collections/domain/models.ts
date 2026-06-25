export interface Collection {
    id: string;
    name: string;
    owner_id: string;
    workspace_id: string;
    created_at: string;
}

export interface RequestSummary {
    id: string;
    name: string;
    method: string;
    collection_id: string;
    kind: "http" | "flow";
}

export type Role = "owner" | "editor";

/** A collection with its request summaries, as returned by /api/v2/tree. The
 * `role` is the current user's role in the parent workspace. */
export interface CollectionNode {
    id: string;
    name: string;
    owner_id: string;
    workspace_id: string;
    created_at: string;
    role: Role;
    owner_username: string;
    requests: RequestSummary[];
}
