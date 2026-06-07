import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up as a Dog Owner",
  description: "Create your DogCareGH account to find trusted dog sitters, walkers, and groomers near you in Ghana.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
