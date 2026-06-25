// Single source of truth for the persisted auth tokens. Kept tiny and
// dependency-free so both the HTTP client and the auth feature can use it.
//
// The v2 API issues an access/refresh pair: the short-lived access token rides
// every request; the long-lived refresh token is used only to rotate the pair
// when the access token expires (see common/api/session.ts).
const ACCESS_KEY = "flux_access_token";
const REFRESH_KEY = "flux_refresh_token";

export const tokenStorage = {
    /** The access token attached to outgoing requests. */
    get(): string | null {
        return localStorage.getItem(ACCESS_KEY);
    },
    /** The refresh token used to rotate the pair when the access token expires. */
    getRefresh(): string | null {
        return localStorage.getItem(REFRESH_KEY);
    },
    /** Persist a freshly issued (or rotated) token pair. */
    set(accessToken: string, refreshToken: string): void {
        localStorage.setItem(ACCESS_KEY, accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
    },
    clear(): void {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
    },
};
