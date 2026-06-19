import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Dog care provider",
  description: "Join DogCareGH as a verified dog care provider. Earn money doing what you love — dog sitting, walking, grooming and more across Ghana.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
