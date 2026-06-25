import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/main/common/utils/cn";
import { timeAgo } from "@/main/common/utils/format";
import { useUiPrefs } from "@/main/common/ui/useUiPrefs";
import type { Notification } from "../domain/models";
import { useNotifications } from "./useNotifications";

export function NotificationsBell() {
    const { items, unread, markRead, markAllRead, dismiss, runAction, busyId } = useNotifications();
    const showBadge = useUiPrefs((s) => s.unreadBadge);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("mousedown", onClick);
        return () => window.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-fg ring-accent"
                title="Notifications"
                aria-label="Notifications"
            >
                <Bell size={16} />
                {showBadge && unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-elevated shadow-2xl"
                        initial={{ opacity: 0, scale: 0.97, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                    >
                        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                            <p className="text-[13px] font-semibold text-fg">Notifications</p>
                            {unread > 0 && (
                                <button
                                    onClick={() => void markAllRead()}
                                    className="flex items-center gap-1 text-[11px] text-muted hover:text-fg"
                                >
                                    <CheckCheck size={13} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {items.length === 0 ? (
                                <p className="px-3.5 py-8 text-center text-[12px] text-subtle">You're all caught up.</p>
                            ) : (
                                items.map((n) => (
                                    <NotificationRow
                                        key={n.id}
                                        n={n}
                                        busy={busyId === n.id}
                                        onRead={() => void markRead(n.id)}
                                        onDismiss={() => void dismiss(n.id)}
                                        onAction={(key) => void runAction(n, key)}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const actionClasses: Record<string, string> = {
    primary: "bg-accent text-white hover:brightness-110",
    default: "bg-surface text-fg border border-border hover:border-subtle",
    danger: "text-red-400 hover:bg-red-500/10 border border-transparent",
};

function NotificationRow({
    n,
    busy,
    onRead,
    onDismiss,
    onAction,
}: {
    n: Notification;
    busy: boolean;
    onRead: () => void;
    onDismiss: () => void;
    onAction: (key: string) => void;
}) {
    return (
        <div
            className={cn(
                "group relative flex gap-2.5 border-b border-border/60 px-3.5 py-3 last:border-0",
                !n.read && "bg-accent/[0.06]",
            )}
        >
            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
            <div className={cn("min-w-0 flex-1", n.read && "pl-4")}>
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-medium leading-snug text-fg">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-subtle">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p className="mt-0.5 text-[12px] leading-snug text-muted">{n.body}</p>}

                {n.actions.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                        {n.actions.map((a) => (
                            <button
                                key={a.key}
                                disabled={busy}
                                onClick={() => onAction(a.key)}
                                className={cn(
                                    "rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all disabled:opacity-40",
                                    actionClasses[a.style] ?? actionClasses.default,
                                )}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {!n.read && (
                    <button
                        onClick={onRead}
                        title="Mark read"
                        className="flex h-5 w-5 items-center justify-center rounded text-subtle hover:bg-surface hover:text-fg"
                    >
                        <Check size={12} />
                    </button>
                )}
                <button
                    onClick={onDismiss}
                    title="Dismiss"
                    className="flex h-5 w-5 items-center justify-center rounded text-subtle hover:bg-surface hover:text-fg"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}
