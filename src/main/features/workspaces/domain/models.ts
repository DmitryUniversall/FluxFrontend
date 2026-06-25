// Workspace domain models (mirror the backend's public shapes).

export type WorkspaceRole = "owner" | "editor";

export interface Workspace {
    id: string;
    name: string;
    owner_id: string;
    is_personal: boolean;
    role: WorkspaceRole; // the current user's role here
    member_count: number;
    created_at: string;
}

export interface WorkspaceMember {
    id: string; // user id
    username: string;
    role: WorkspaceRole;
}

export function canWrite(role: WorkspaceRole): boolean {
    return role === "owner" || role === "editor";
}
