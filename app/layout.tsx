import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ChatWrapper } from "@/components/chat-wrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DogCareGH — Trusted Pet Care in Ghana",
  description: "Find trusted pet sitters, dog walkers, groomers, and overnight dog care near you in Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChatWrapper>{children}</ChatWrapper>
      </body>
    </html>
  );
}
