// Action dispatch registry. The notifications feature renders the buttons a
// notification declares, but doesn't know what they *do* - that belongs to the
// producing feature (e.g. invitations wires up "accept"/"decline"). Those
// features register a handler here, keeping the dependency arrow pointing at
// notifications rather than the other way around.
import type { Notification } from "./models";

export type ActionHandler = (notification: Notification) => Promise<void> | void;

// Keyed by `${notificationType}:${actionKey}`.
const handlers = new Map<string, ActionHandler>();

export function registerNotificationAction(type: string, key: string, handler: ActionHandler): void {
    handlers.set(`${type}:${key}`, handler);
}

export function getNotificationAction(type: string, key: string): ActionHandler | undefined {
    return handlers.get(`${type}:${key}`);
}
