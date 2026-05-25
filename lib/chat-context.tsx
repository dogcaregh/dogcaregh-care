"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ChatContextValue = {
  openBookingId: string | null;
  isMinimized: boolean;
  openChat: (bookingId: string) => void;
  closeChat: () => void;
  toggleMinimize: () => void;
};

const ChatContext = createContext<ChatContextValue>({
  openBookingId: null,
  isMinimized: false,
  openChat: () => {},
  closeChat: () => {},
  toggleMinimize: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized]     = useState(false);

  // Restore from sessionStorage on mount so chat survives client-side navigation
  useEffect(() => {
    const id = sessionStorage.getItem("dcgh_chat_id");
    if (id) {
      setOpenBookingId(id);
      setIsMinimized(sessionStorage.getItem("dcgh_chat_min") === "1");
    }
  }, []);

  const openChat = useCallback((bookingId: string) => {
    setOpenBookingId(bookingId);
    setIsMinimized(false);
    sessionStorage.setItem("dcgh_chat_id", bookingId);
    sessionStorage.removeItem("dcgh_chat_min");
  }, []);

  const closeChat = useCallback(() => {
    setOpenBookingId(null);
    setIsMinimized(false);
    sessionStorage.removeItem("dcgh_chat_id");
    sessionStorage.removeItem("dcgh_chat_min");
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => {
      const next = !prev;
      if (next) sessionStorage.setItem("dcgh_chat_min", "1");
      else sessionStorage.removeItem("dcgh_chat_min");
      return next;
    });
  }, []);

  return (
    <ChatContext.Provider value={{ openBookingId, isMinimized, openChat, closeChat, toggleMinimize }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
