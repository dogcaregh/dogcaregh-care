import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how DogCareGH works for dog owners and care providers. Search, book, pay securely, and review — all in one place.",
  openGraph: {
    title: "How DogCareGH Works | Trusted Dog Care in Ghana",
    description: "See how to find and book a trusted dog care provider, or how to become a verified provider on DogCareGH.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
