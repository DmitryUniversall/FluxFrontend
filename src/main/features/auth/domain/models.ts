// The instance-level RBAC role, resolved by the backend on /users/me.
export interface UserRole {
    id: string;
    name: string;
}

export interface User {
    id: string;
    username: string;
    created_at: string;
    role?: UserRole | null;
    // Effective permission keys for this user (see backend rbac permission catalog).
    permissions?: string[];
}

export interface Credentials {
    username: string;
    password: string;
}

export interface TokenPair {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface AuthResult {
    user: User;
    tokens: TokenPair;
}
