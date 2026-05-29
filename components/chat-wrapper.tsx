"use client";

import { ChatProvider } from "@/lib/chat-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { ChatPopup } from "./chat-popup";
import { NotificationToaster } from "./notification-toaster";

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <ChatProvider>
        {children}
        <ChatPopup />
        <NotificationToaster />
      </ChatProvider>
    </NotificationsProvider>
  );
}
