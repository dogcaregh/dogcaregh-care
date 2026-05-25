"use client";

import { ChatProvider } from "@/lib/chat-context";
import { ChatPopup } from "./chat-popup";

export function ChatWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      {children}
      <ChatPopup />
    </ChatProvider>
  );
}
