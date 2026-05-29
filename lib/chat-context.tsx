"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY_ID  = "dcgh_chat_id";
const KEY_MIN = "dcgh_chat_min";
const CHANNEL = "dcgh_chat_sync";

type SyncMsg =
  | { type: "open";     bookingId: string }
  | { type: "close" }
  | { type: "minimize"; value: boolean };

type ChatContextValue = {
  openBookingId: string | null;
  isMinimized: boolean;
  openChat: (bookingId: string) => void;
  openChatMinimized: (bookingId: string) => void;
  closeChat: () => void;
  toggleMinimize: () => void;
};

const ChatContext = createContext<ChatContextValue>({
  openBookingId: null,
  isMinimized: false,
  openChat: () => {},
  openChatMinimized: () => {},
  closeChat: () => {},
  toggleMinimize: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized]     = useState(false);

  // Restore from localStorage on mount — picks up in every new tab
  useEffect(() => {
    const id = localStorage.getItem(KEY_ID);
    if (id) {
      setOpenBookingId(id);
      setIsMinimized(localStorage.getItem(KEY_MIN) === "1");
    }
  }, []);

  // Cross-tab sync: BroadcastChannel (instant, same origin) +
  // storage event fallback (fires in other tabs on every localStorage write)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (e: MessageEvent<SyncMsg>) => {
        const msg = e.data;
        if (msg.type === "open") {
          setOpenBookingId(msg.bookingId);
          setIsMinimized(false);
        } else if (msg.type === "close") {
          setOpenBookingId(null);
          setIsMinimized(false);
        } else if (msg.type === "minimize") {
          setIsMinimized(msg.value);
        }
      };
    }

    function onStorage(e: StorageEvent) {
      if (e.key === KEY_ID) {
        setOpenBookingId(e.newValue ?? null);
        if (!e.newValue) setIsMinimized(false);
      }
      if (e.key === KEY_MIN) {
        setIsMinimized(e.newValue === "1");
      }
    }
    window.addEventListener("storage", onStorage);

    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const broadcast = useCallback((msg: SyncMsg) => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(msg);
    bc.close();
  }, []);

  const openChat = useCallback((bookingId: string) => {
    setOpenBookingId(bookingId);
    setIsMinimized(false);
    localStorage.setItem(KEY_ID, bookingId);
    localStorage.removeItem(KEY_MIN);
    broadcast({ type: "open", bookingId });
  }, [broadcast]);

  const openChatMinimized = useCallback((bookingId: string) => {
    setOpenBookingId(bookingId);
    setIsMinimized(true);
    localStorage.setItem(KEY_ID, bookingId);
    localStorage.setItem(KEY_MIN, "1");
    broadcast({ type: "open", bookingId });
    broadcast({ type: "minimize", value: true });
  }, [broadcast]);

  const closeChat = useCallback(() => {
    setOpenBookingId(null);
    setIsMinimized(false);
    localStorage.removeItem(KEY_ID);
    localStorage.removeItem(KEY_MIN);
    broadcast({ type: "close" });
  }, [broadcast]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => {
      const next = !prev;
      if (next) localStorage.setItem(KEY_MIN, "1");
      else localStorage.removeItem(KEY_MIN);
      broadcast({ type: "minimize", value: next });
      return next;
    });
  }, [broadcast]);

  return (
    <ChatContext.Provider value={{ openBookingId, isMinimized, openChat, openChatMinimized, closeChat, toggleMinimize }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
