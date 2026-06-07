import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data } = await sb
    .from("providers")
    .select("neighbourhood, bio, avatar_url, users!user_id(name)")
    .eq("id", params.id)
    .single();

  if (!data) {
    return { title: "Provider Profile" };
  }

  const userRow = data.users as { name: string } | { name: string }[] | null;
  const name = (Array.isArray(userRow) ? userRow[0]?.name : userRow?.name) ?? "Dog Carer";
  const area = (data.neighbourhood as string | null) ?? "Accra";
  const bio  = (data.bio as string | null)?.slice(0, 155);

  const title       = `${name} — Dog Carer in ${area}`;
  const description = bio ?? `Book ${name}, a trusted dog carer in ${area}, Ghana. View services, availability, and reviews on DogCareGH.`;
  const image       = (data.avatar_url as string | null) ?? "/homepage.jpg";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | DogCareGH`,
      description,
      type: "profile",
      images: [{ url: image, alt: `${name} — dog carer in ${area}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | DogCareGH`,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
