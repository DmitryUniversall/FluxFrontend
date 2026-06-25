// Notification domain models. Mirrors the backend's generic event shape: a
// `type` tag, an opaque `data` payload owned by the producing feature, and
// declarative `actions` the bell renders as inline buttons.

export type NotificationType =
    | "collection_shared"
    | "workspace_invite"
    | "invite_accepted"
    | "invite_declined"
    | "role_changed"
    | "removed_from_workspace";

export type ActionStyle = "primary" | "default" | "danger";

export interface NotificationAction {
    key: string;
    label: string;
    style: ActionStyle;
}

export interface Notification {
    id: string;
    type: NotificationType | string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    actions: NotificationAction[];
    read: boolean;
    created_at: string;
}

export interface NotificationFeed {
    items: Notification[];
    unread: number;
}
