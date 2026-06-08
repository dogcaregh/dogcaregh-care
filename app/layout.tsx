import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ChatWrapper } from "@/components/chat-wrapper";
import { GoogleAnalytics } from "@next/third-parties/google";

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

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dogcaregh.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "DogCareGH — Trusted Pet Care in Ghana",
    template: "%s | DogCareGH",
  },
  description: "Find trusted pet sitters, dog walkers, groomers, and overnight dog care near you in Ghana.",
  openGraph: {
    siteName: "DogCareGH",
    type: "website",
    locale: "en_GH",
    images: [
      {
        url: "/homepage.jpg",
        width: 1200,
        height: 630,
        alt: "DogCareGH — Trusted pet care in Ghana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@dogcaregh",
  },
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
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
