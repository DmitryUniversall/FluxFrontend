// Use-cases for auth. Thin orchestration over the repository + token storage,
// kept separate from the viewmodel so the rules live in the domain layer.
import { tokenStorage } from "@/main/common/api/token-storage";
import type { AuthRepository } from "../data/auth-repository";
import type { Credentials, User } from "./models";

export async function signIn(repo: AuthRepository, creds: Credentials): Promise<User> {
    const result = await repo.login(creds);
    tokenStorage.set(result.tokens.access_token, result.tokens.refresh_token);
    return result.user;
}

export async function signUp(repo: AuthRepository, creds: Credentials): Promise<User> {
    const result = await repo.register(creds);
    tokenStorage.set(result.tokens.access_token, result.tokens.refresh_token);
    return result.user;
}

export async function restoreSession(repo: AuthRepository): Promise<User | null> {
    if (!tokenStorage.get()) return null;
    try {
        return await repo.me();
    } catch {
        tokenStorage.clear();
        return null;
    }
}

export function signOut(repo: AuthRepository): void {
    // Best-effort server-side revocation: the request captures the current access
    // token synchronously, so clearing local tokens right after is safe. We don't
    // await it - sign-out is instant regardless of the network.
    void repo.logout().catch(() => {});
    tokenStorage.clear();
}
