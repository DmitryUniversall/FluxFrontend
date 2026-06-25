// An identity is a named, reusable auth configuration stored in the workspace's
// "auth store". Its `auth` is the same shape a request uses (minus the
// "identity" indirection - an identity holds a concrete scheme).
import type { Auth } from "@/main/features/request-editor/domain/models";

export interface Identity {
    id: string;
    workspace_id: string;
    owner_id: string;
    name: string;
    auth: Auth;
    is_default: boolean;
    created_at: string;
}

// Flatten an auth that may point at a stored identity into a concrete auth.
// `auth.type === "identity"` resolves to the referenced identity (or the
// workspace default when no id is set); anything else is returned untouched.
export function resolveIdentityAuth(auth: Auth, identities: Identity[], defaultId: string | null): Auth {
    // "parameter" auth must be supplied by the caller; if it ever reaches here
    // unresolved, degrade to no auth rather than send a literal "parameter".
    if (auth.type === "parameter") return { ...auth, type: "none" };
    if (auth.type !== "identity") return auth;
    const id = auth.identity_id || defaultId;
    const found = id ? identities.find((i) => i.id === id) : undefined;
    return found ? found.auth : { ...auth, type: "none" };
}
