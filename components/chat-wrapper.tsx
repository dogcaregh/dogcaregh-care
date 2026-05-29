"use client";

import { ChatProvider } from "@/lib/chat-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { ChatPopup } from "./chat-popup";

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <ChatProvider>
        {children}
        <ChatPopup />
      </ChatProvider>
    </NotificationsProvider>
  );
}
