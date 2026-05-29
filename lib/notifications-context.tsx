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
};

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
            setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 30));
          }
        )
        .subscribe();
    }

    init();
    return () => { if (channel) sb.removeChannel(channel); };
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    await createClient().from("notifications").update({ read: true }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await createClient()
      .from("notifications")
      .update({ read: true })
      .eq("user_id", uid)
      .eq("read", false);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
