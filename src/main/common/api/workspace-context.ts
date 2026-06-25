// The active workspace id, shared between the workspaces store and the data
// repositories. Repositories read it to scope every request to the workspace
// the user is currently viewing, without threading the id through every call
// site. The workspaces viewmodel is the single writer.
let activeWorkspaceId: string | null = null;

export const workspaceContext = {
    get: (): string | null => activeWorkspaceId,
    set: (id: string | null): void => {
        activeWorkspaceId = id;
    },
    /** Throw-if-missing accessor for write paths that require a workspace. */
    require: (): string => {
        if (!activeWorkspaceId) throw new Error("No active workspace");
        return activeWorkspaceId;
    },
};
