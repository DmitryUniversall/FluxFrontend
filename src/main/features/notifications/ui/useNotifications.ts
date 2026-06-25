// Notifications viewmodel (the hook is the ViewModel). Owns the bell's feed and
// unread count; `refresh` is the silent reload the ~3s poller calls. Inline
// actions are dispatched through the action registry so this feature stays
// agnostic to what any given action means.
import { create } from "zustand";
import { ApiError } from "@/core/http/http-client";
import { toast } from "@/main/common/ui/toast";
import { notificationsRepository } from "../data/notifications-repository";
import { getNotificationAction } from "../domain/action-registry";
import type { Notification } from "../domain/models";

interface NotificationsVM {
    items: Notification[];
    unread: number;
    loading: boolean;
    busyId: string | null;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    dismiss: (id: string) => Promise<void>;
    runAction: (notification: Notification, key: string) => Promise<void>;
}

export const useNotifications = create<NotificationsVM>((set, get) => ({
    items: [],
    unread: 0,
    loading: false,
    busyId: null,

    load: async () => {
        set({ loading: true });
        const feed = await notificationsRepository.feed();
        set({ items: feed.items, unread: feed.unread, loading: false });
    },

    refresh: async () => {
        try {
            const feed = await notificationsRepository.feed();
            // avoid needless re-renders when nothing changed
            if (feed.unread !== get().unread || JSON.stringify(feed.items) !== JSON.stringify(get().items)) {
                set({ items: feed.items, unread: feed.unread });
            }
        } catch {
            /* polling failures are non-fatal */
        }
    },

    markRead: async (id) => {
        const target = get().items.find((n) => n.id === id);
        if (!target || target.read) return;
        set((s) => ({
            items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
            unread: Math.max(0, s.unread - 1),
        }));
        try {
            await notificationsRepository.markRead(id);
        } catch {
            await get().refresh();
        }
    },

    markAllRead: async () => {
        const feed = await notificationsRepository.markAllRead();
        set({ items: feed.items, unread: feed.unread });
    },

    dismiss: async (id) => {
        const feed = await notificationsRepository.dismiss(id);
        set({ items: feed.items, unread: feed.unread });
    },

    runAction: async (notification, key) => {
        const handler = getNotificationAction(notification.type, key);
        set({ busyId: notification.id });
        try {
            // A registered handler owns the side effect (e.g. accept an invite); with
            // none, the action just acknowledges and dismisses the notification.
            if (handler) await handler(notification);
            await get().dismiss(notification.id);
        } catch (e) {
            // The action failed (e.g. invite already answered elsewhere): surface it
            // and resync so the feed reflects reality.
            toast.error(e instanceof ApiError ? e.message : "Couldn't complete that action");
            await get().refresh();
        } finally {
            set({ busyId: null });
        }
    },
}));
