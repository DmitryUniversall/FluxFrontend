// Workspaces viewmodel. Owns the list of workspaces the user belongs to and the
// active selection (persisted), and is the single writer of `workspaceContext`
// so every data repository scopes its calls to the right workspace.
import { create } from "zustand";
import { workspaceContext } from "@/main/common/api/workspace-context";
import { workspacesRepository } from "../data/workspaces-repository";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "../domain/models";

const ACTIVE_KEY = "flux_active_workspace";

interface WorkspacesVM {
    workspaces: Workspace[];
    activeId: string | null;
    loaded: boolean;
    load: () => Promise<void>;
    setActive: (id: string) => void;
    active: () => Workspace | null;
    create: (name: string) => Promise<Workspace>;
    rename: (id: string, name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    members: (id: string) => Promise<WorkspaceMember[]>;
    setRole: (id: string, memberId: string, role: WorkspaceRole) => Promise<WorkspaceMember[]>;
    removeMember: (id: string, memberId: string) => Promise<WorkspaceMember[]>;
}

function pickActive(workspaces: Workspace[], preferred: string | null): string | null {
    if (preferred && workspaces.some((w) => w.id === preferred)) return preferred;
    const personal = workspaces.find((w) => w.is_personal);
    return personal?.id ?? workspaces[0]?.id ?? null;
}

export const useWorkspaces = create<WorkspacesVM>((set, get) => ({
    workspaces: [],
    activeId: null,
    loaded: false,

    load: async () => {
        const workspaces = await workspacesRepository.list();
        const activeId = pickActive(workspaces, get().activeId ?? localStorage.getItem(ACTIVE_KEY));
        workspaceContext.set(activeId);
        if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
        set({ workspaces, activeId, loaded: true });
    },

    setActive: (id) => {
        if (id === get().activeId) return;
        localStorage.setItem(ACTIVE_KEY, id);
        workspaceContext.set(id);
        set({ activeId: id });
    },

    active: () => {
        const { workspaces, activeId } = get();
        return workspaces.find((w) => w.id === activeId) ?? null;
    },

    create: async (name) => {
        const ws = await workspacesRepository.create(name);
        set((s) => ({ workspaces: [...s.workspaces, ws] }));
        get().setActive(ws.id);
        return ws;
    },

    rename: async (id, name) => {
        const ws = await workspacesRepository.rename(id, name);
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? ws : w)) }));
    },

    remove: async (id) => {
        await workspacesRepository.remove(id);
        const remaining = get().workspaces.filter((w) => w.id !== id);
        set({ workspaces: remaining });
        if (get().activeId === id) {
            const next = pickActive(remaining, null);
            if (next) get().setActive(next);
        }
    },

    members: (id) => workspacesRepository.members(id),
    setRole: (id, memberId, role) => workspacesRepository.setRole(id, memberId, role),
    removeMember: (id, memberId) => workspacesRepository.removeMember(id, memberId),
}));
