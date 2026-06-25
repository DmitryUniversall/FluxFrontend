import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { AuthResult, Credentials, User } from "../domain/models";

export const authRepository = {
    register: (creds: Credentials) => api.request<AuthResult>(endpoints.register, { method: "POST", body: creds }),
    login: (creds: Credentials) => api.request<AuthResult>(endpoints.login, { method: "POST", body: creds }),
    me: () => api.request<User>(endpoints.me),
    updateUsername: (username: string) => api.request<User>(endpoints.me, { method: "PATCH", body: { username } }),
    changePassword: (current_password: string, new_password: string) =>
        api.request<void>(endpoints.mePassword, { method: "POST", body: { current_password, new_password } }),
    // Revokes the current server-side session (best-effort on sign-out).
    logout: () => api.request<void>(endpoints.logout, { method: "POST" }),
};

export type AuthRepository = typeof authRepository;
