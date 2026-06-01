"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

const SIZE_LABEL: Record<string, string> = {
  small: "Small", medium: "Medium", large: "Large", xlarge: "XL",
};

const TEMPERAMENT = [
  { id: "friendly",     emoji: "😊", label: "Friendly"     },
  { id: "playful",      emoji: "🎾", label: "Playful"      },
  { id: "calm",         emoji: "😌", label: "Calm"         },
  { id: "energetic",    emoji: "⚡", label: "Energetic"    },
  { id: "shy",          emoji: "🙈", label: "Shy"          },
  { id: "affectionate", emoji: "🥰", label: "Affectionate" },
  { id: "independent",  emoji: "🦁", label: "Independent"  },
  { id: "social",       emoji: "🐕", label: "Social"       },
  { id: "protective",   emoji: "🛡️", label: "Protective"   },
  { id: "anxious",      emoji: "😰", label: "Anxious"      },
  { id: "stubborn",     emoji: "🐂", label: "Stubborn"     },
  { id: "gentle",       emoji: "🕊️", label: "Gentle"       },
  { id: "aggressive",   emoji: "⚠️", label: "Aggressive"   },
  { id: "bites",        emoji: "🦷", label: "Bites"        },
];

const DIET = [
  { id: "kibble",      emoji: "🥣", label: "Kibble"      },
  { id: "wet_food",    emoji: "🥩", label: "Wet Food"    },
  { id: "raw",         emoji: "🍖", label: "Raw Diet"    },
  { id: "mixed",       emoji: "🔀", label: "Mixed"       },
  { id: "home_cooked", emoji: "🍳", label: "Home-cooked" },
];

const ALLERGIES = [
  { id: "chicken", label: "Chicken 🐔" },
  { id: "beef",    label: "Beef 🥩"   },
  { id: "dairy",   label: "Dairy 🥛"  },
  { id: "wheat",   label: "Wheat 🌾"  },
  { id: "eggs",    label: "Eggs 🥚"   },
  { id: "fish",    label: "Fish 🐟"   },
  { id: "soy",     label: "Soy 🫘"    },
  { id: "none",    label: "None ✅"   },
];

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  age: number | null;
  vaccination_status: boolean;
  neutered: boolean | null;
  leash_trained: boolean | null;
  avatar_url: string | null;
  temperament: string[] | null;
  allergies: string[] | null;
  diet_preference: string | null;
  bio: string | null;
};

export default function DogViewPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const router = useRouter();

  const [dog,     setDog]     = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dogId) return;
    async function load() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data, error: err } = await sb
        .from("dogs")
        .select("id, name, breed, size, age, vaccination_status, neutered, leash_trained, avatar_url, temperament, allergies, diet_preference, bio")
        .eq("id", dogId)
        .single();

      if (err || !data) {
        setError("Dog profile not found or you don't have access.");
      } else {
        const d = data as Dog;
        d.temperament = Array.isArray(d.temperament) ? d.temperament : [];
        d.allergies   = Array.isArray(d.allergies)   ? d.allergies   : [];
        setDog(d);
      }
      setLoading(false);
    }
    load();
  }, [dogId, router]);

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );

  if (error || !dog) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="text-sm text-red-300">{error ?? "Dog not found."}</p>
      <button onClick={() => router.back()} className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 hover:bg-white/10">← Go back</button>
    </div>
  );

  const dogTemperament = dog.temperament ?? [];
  const dogAllergies   = dog.allergies   ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10"
        >
          ← Back
        </button>
      </nav>

      <div className="mx-auto max-w-lg px-4 py-8 md:px-6 space-y-4">

        {/* Hero card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-2 w-full" style={{ backgroundColor: avatarBg(dog.id) }} />
          <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
            {dog.avatar_url ? (
              <img src={dog.avatar_url} alt={dog.name} className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl text-5xl shadow-lg" style={{ backgroundColor: avatarBg(dog.id) }}>
                🐕
              </div>
            )}
            <h1 className="mt-4 text-2xl font-extrabold" style={{ color: "#0a2e30" }}>{dog.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {[dog.breed, dog.size ? SIZE_LABEL[dog.size] : null, dog.age != null ? `${dog.age} yrs` : null]
                .filter(Boolean).join(" · ") || "No details added yet"}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={dog.vaccination_status
                  ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                  : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                {dog.vaccination_status ? "✓ Vaccinated" : "Unvaccinated"}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                {dog.neutered ? "Neutered / Spayed" : "Intact"}
              </span>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={dog.leash_trained === true
                  ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                  : dog.leash_trained === false
                    ? { background: "rgba(239,68,68,.1)", color: "#dc2626" }
                    : { background: "#f3f4f6", color: "#9ca3af" }}>
                {dog.leash_trained === true ? "🦮 Leash Trained" : dog.leash_trained === false ? "🦮 Not Leash Trained" : "🦮 Leash status not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Personality */}
        {dogTemperament.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Personality</p>
            <div className="flex flex-wrap gap-2">
              {dogTemperament.map(t => {
                const opt = TEMPERAMENT.find(o => o.id === t);
                return opt ? (
                  <span key={t} className="rounded-full px-3 py-1 text-sm font-medium"
                    style={{ border: "1px solid #00b096", background: "rgba(0,176,150,0.08)", color: "#007a66" }}>
                    {opt.emoji} {opt.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Diet + Allergies */}
        {(dog.diet_preference || dogAllergies.length > 0) && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {dog.diet_preference && (
              <div className={dogAllergies.length > 0 ? "mb-4" : ""}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Diet</p>
                {(() => {
                  const opt = DIET.find(o => o.id === dog.diet_preference);
                  return opt ? (
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700">
                      {opt.emoji} {opt.label}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
            {dogAllergies.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {dogAllergies.map(a => {
                    const opt = ALLERGIES.find(o => o.id === a);
                    return opt ? (
                      <span key={a} className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-sm text-orange-700">
                        {opt.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {dog.bio && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">About {dog.name}</p>
            <p className="text-sm leading-relaxed text-gray-700">{dog.bio}</p>
          </div>
        )}

      </div>
    </div>
  );
}
