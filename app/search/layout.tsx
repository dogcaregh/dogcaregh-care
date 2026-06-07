import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Dog Carers Near You",
  description: "Search verified dog sitters, walkers, groomers, and daycare providers across Accra and Greater Accra, Ghana. Filter by service, location, and price.",
  openGraph: {
    title: "Find Dog Carers Near You | DogCareGH",
    description: "Search verified dog sitters, walkers, groomers, and daycare providers across Accra, Ghana.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
