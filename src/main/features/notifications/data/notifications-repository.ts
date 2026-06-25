import { api } from "@/main/common/api/api-client";
import { endpoints } from "@/main/common/api/endpoints";
import type { Notification, NotificationFeed } from "../domain/models";

export const notificationsRepository = {
    feed: () => api.request<NotificationFeed>(endpoints.notifications),
    markRead: (id: string) => api.request<Notification>(endpoints.notificationRead(id), { method: "POST" }),
    markAllRead: () => api.request<NotificationFeed>(endpoints.notificationsReadAll, { method: "POST" }),
    dismiss: (id: string) => api.request<NotificationFeed>(endpoints.notification(id), { method: "DELETE" }),
};

export type NotificationsRepository = typeof notificationsRepository;
