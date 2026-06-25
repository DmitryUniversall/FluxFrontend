// App-wide HTTP client instance: wires the core HttpClient to our token store,
// the (desktop-configurable) server base URL, and the 401 -> refresh handler.
// All feature repositories depend on this rather than fetch directly.
import { HttpClient } from "@/core/http/http-client";
import { isTauri } from "@/main/common/platform";
import { APP_VERSION } from "@/main/common/version";
import { serverConfig } from "./server-config";
import { refreshSession } from "./session";
import { tokenStorage } from "./token-storage";

// Identifies the calling build to the server (platform + version). The backend
// uses this to decide whether a desktop client must update; "<platform>/<version>".
const clientId = (): string => `${isTauri() ? "desktop" : "web"}/${APP_VERSION}`;

export const api = new HttpClient(
    () => serverConfig.baseUrl(),
    () => tokenStorage.get(),
    () => refreshSession(),
    () => ({ "X-Flux-Client": clientId() }),
);
