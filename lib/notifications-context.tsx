"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  booking_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toastQueue: AppNotification[];
  dismissToast: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  toastQueue: [],
  dismissToast: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastQueue,    setToastQueue]    = useState<AppNotification[]>([]);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    let channel: ReturnType<typeof sb.channel> | null = null;

    async function init() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      const { data } = await sb
        .from("notifications")
        .select("id, booking_id, type, message, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      // Populate history — do NOT add to toastQueue (no toasts for old notifications)
      setNotifications((data ?? []) as AppNotification[]);

      channel = sb
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const incoming = payload.new as AppNotification;
            setNotifications(prev => [incoming, ...prev].slice(0, 30));
            // Only new real-time arrivals go into the toast queue
            setToastQueue(prev => [...prev, incoming]);
          }
        )
        .subscribe();
    }

    init();
    return () => { if (channel) sb.removeChannel(channel); };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await createClient().from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await createClient().from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, toastQueue, dismissToast }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
