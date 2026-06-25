// Auth viewmodel (Android-style: the hook is the ViewModel). Holds session
// state and exposes intents; delegates rules to the use-cases.
import { create } from "zustand";
import { ApiError } from "@/core/http/http-client";
import { authRepository } from "../data/auth-repository";
import type { Credentials, User } from "../domain/models";
import { restoreSession, signIn, signOut, signUp } from "../domain/use-cases";

type Status = "loading" | "authed" | "guest";

interface AuthVM {
    user: User | null;
    status: Status;
    error: string | null;
    submitting: boolean;
    init: () => Promise<void>;
    login: (creds: Credentials) => Promise<boolean>;
    register: (creds: Credentials) => Promise<boolean>;
    updateUsername: (username: string) => Promise<void>;
    logout: () => void;
}

function message(e: unknown): string {
    if (e instanceof ApiError) return e.message;
    return "Something went wrong";
}

export const useAuth = create<AuthVM>((set) => ({
    user: null,
    status: "loading",
    error: null,
    submitting: false,

    init: async () => {
        const user = await restoreSession(authRepository);
        set({ user, status: user ? "authed" : "guest" });
    },

    login: async (creds) => {
        set({ submitting: true, error: null });
        try {
            const user = await signIn(authRepository, creds);
            set({ user, status: "authed", submitting: false });
            return true;
        } catch (e) {
            set({ error: message(e), submitting: false });
            return false;
        }
    },

    register: async (creds) => {
        set({ submitting: true, error: null });
        try {
            const user = await signUp(authRepository, creds);
            set({ user, status: "authed", submitting: false });
            return true;
        } catch (e) {
            set({ error: message(e), submitting: false });
            return false;
        }
    },

    updateUsername: async (username) => {
        const user = await authRepository.updateUsername(username);
        set({ user });
    },

    logout: () => {
        signOut(authRepository);
        set({ user: null, status: "guest", error: null });
    },
}));

// Permission gate for the UI. Reads the permissions the backend resolved onto the
// current user, so a component can hide or disable what the user can't do.
export function useHasPermission(permission: string): boolean {
    return useAuth((s) => (s.user?.permissions ?? []).includes(permission));
}
