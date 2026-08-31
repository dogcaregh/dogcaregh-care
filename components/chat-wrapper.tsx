"use client";

import { usePathname } from "next/navigation";
import { ChatProvider } from "@/lib/chat-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { ChatPopup } from "./chat-popup";
import { NotificationToaster } from "./notification-toaster";

const SUPPRESS_PATHS = new Set(["/pitch"]);

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const suppress = SUPPRESS_PATHS.has(pathname);
  return (
    <NotificationsProvider>
      <ChatProvider>
        {children}
        {!suppress && <ChatPopup />}
        {!suppress && <NotificationToaster />}
      </ChatProvider>
    </NotificationsProvider>
  );
}
