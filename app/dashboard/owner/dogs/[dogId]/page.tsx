"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import ImageCropModal from "@/components/image-crop-modal";

// ── Types ──────────────────────────────────────────────────────────────────

type Dog = {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  size: "small" | "medium" | "large" | "xlarge" | null;
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

// ── Options ────────────────────────────────────────────────────────────────

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

const SIZES = [
  { id: "small",  label: "Small"  },
  { id: "medium", label: "Medium" },
  { id: "large",  label: "Large"  },
  { id: "xlarge", label: "XL"     },
] as const;

const BREEDS = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "Yorkshire Terrier", "Dachshund",
  "Boxer", "Shih Tzu", "Siberian Husky", "Doberman", "Great Dane", "Chihuahua",
  "Border Collie", "Cocker Spaniel", "Maltese", "Mixed Breed", "Boerboel",
  "Basenji", "Aspin", "Bichon Frise", "Pug", "Schnauzer",
];

// ── Helpers ────────────────────────────────────────────────────────────────

const PALETTE = ["#00b096","#0a7c6e","#059669","#0d9488","#0891b2","#6366f1","#8b5cf6","#ec4899"];
const avatarBg = (s: string) => PALETTE[s.charCodeAt(0) % PALETTE.length];

const SIZE_LABEL: Record<string, string> = {
  small: "Small", medium: "Medium", large: "Large", xlarge: "XL",
};

function toggleArr(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
}

// ── Chip sub-components ────────────────────────────────────────────────────

function MultiChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3.5 py-1.5 text-sm transition select-none active:scale-95"
      style={on
        ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,0.1)", color: "#007a66", fontWeight: 600 }
        : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}
    >
      {children}
    </button>
  );
}

function SingleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3.5 py-1.5 text-sm transition select-none active:scale-95"
      style={on
        ? { borderColor: "#0a2e30", backgroundColor: "#0a2e30", color: "#fff", fontWeight: 600 }
        : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#6b7280" }}
    >
      {children}
    </button>
  );
}

function ToggleCard({
  on, onClick, emoji, label, sub,
}: { on: boolean; onClick: () => void; emoji: string; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border p-4 transition active:scale-[0.98] text-left"
      style={on
        ? { borderColor: "#00b096", backgroundColor: "rgba(0,176,150,0.08)" }
        : { borderColor: "#e5e7eb", backgroundColor: "#fff" }}
    >
      <span className="text-2xl leading-none">{emoji}</span>
      <div>
        <p className="text-xs font-bold" style={{ color: on ? "#00b096" : "#374151" }}>{label}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DogProfilePage() {
  const { dogId } = useParams<{ dogId: string }>();
  const router    = useRouter();

  const [dog,       setDog]       = useState<Dog | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [cropSrc,   setCropSrc]   = useState<string | null>(null);

  // Edit fields
  const [name,        setName]        = useState("");
  const [breed,       setBreed]       = useState("");
  const [age,         setAge]         = useState("");
  const [size,        setSize]        = useState("");
  const [vaccinated,   setVaccinated]   = useState(false);
  const [neutered,     setNeutered]     = useState(false);
  const [leashTrained, setLeashTrained] = useState(false);
  const [temperament, setTemperament] = useState<string[]>([]);
  const [diet,        setDiet]        = useState("");
  const [allergies,   setAllergies]   = useState<string[]>([]);
  const [bio,         setBio]         = useState("");
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dogId) return;
    async function load() {
      try {
        const sb = createClient();
        const { data: authData } = await sb.auth.getUser();
        const user = authData?.user;
        if (!user) { router.replace("/login"); return; }

        const { data, error: err } = await sb
          .from("dogs")
          .select("id, owner_id, name, breed, size, age, vaccination_status, neutered, leash_trained, avatar_url, temperament, allergies, diet_preference, bio")
          .eq("id", dogId)
          .single();

        if (err) {
          setError(`Failed to load dog profile: ${err.message}`);
          setLoading(false);
          return;
        }
        if (!data || data.owner_id !== user.id) {
          router.replace("/dashboard/owner");
          return;
        }

        const d = data as Dog;
        setDog(d);
        populateEdit(d);
        setLoading(false);
      } catch (e) {
        console.error("Dog profile load error:", e);
        setError("Something went wrong loading this profile.");
        setLoading(false);
      }
    }
    load();
  }, [dogId, router]);

  function populateEdit(d: Dog) {
    setName(d.name);
    setBreed(d.breed ?? "");
    setAge(d.age != null ? String(d.age) : "");
    setSize(d.size ?? "");
    setVaccinated(d.vaccination_status);
    setNeutered(d.neutered ?? false);
    setLeashTrained(d.leash_trained ?? false);
    setTemperament(d.temperament ?? []);
    setDiet(d.diet_preference ?? "");
    setAllergies(d.allergies ?? []);
    setBio(d.bio ?? "");
    setAvatarUrl(d.avatar_url);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadCroppedBlob(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    setError(null);
    try {
      const sb   = createClient();
      const path = `${dogId}/${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from("dog-photos").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) {
        setError(`Photo upload failed: ${upErr.message}`);
      } else {
        const { data: urlData } = sb.storage.from("dog-photos").getPublicUrl(path);
        setAvatarUrl(urlData.publicUrl);
      }
    } catch {
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const sb = createClient();
      const { data, error: err } = await sb
        .from("dogs")
        .update({
          name:               name.trim(),
          breed:              breed.trim() || null,
          age:                age ? parseInt(age) : null,
          size:               (size as Dog["size"]) || null,
          vaccination_status: vaccinated,
          neutered,
          leash_trained:      leashTrained,
          avatar_url:         avatarUrl,
          temperament,
          allergies,
          diet_preference:    diet || null,
          bio:                bio.trim() || null,
        })
        .eq("id", dogId)
        .select("id, owner_id, name, breed, size, age, vaccination_status, neutered, leash_trained, avatar_url, temperament, allergies, diet_preference, bio")
        .single();

      if (err) {
        setError(err.message);
      } else if (data) {
        const d = data as Dog;
        // Ensure array fields are always arrays even if DB returns null
        d.temperament = Array.isArray(d.temperament) ? d.temperament : [];
        d.allergies   = Array.isArray(d.allergies)   ? d.allergies   : [];
        setDog(d);
        setEditing(false);
      }
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (dog) { populateEdit(dog); setEditing(true); }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="mt-3 animate-pulse text-sm text-white/50">Loading…</p>
    </div>
  );
  if (error && !dog) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: "#0a2e30" }}>
      <img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" />
      <p className="text-sm text-red-300">{error}</p>
      <Link href="/dashboard/owner" className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 hover:bg-white/10">← Back to dashboard</Link>
    </div>
  );
  if (!dog) return null;

  const INPUT = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";
  const dogTemperament = Array.isArray(dog.temperament) ? dog.temperament : [];
  const dogAllergies   = Array.isArray(dog.allergies)   ? dog.allergies   : [];
  const hasProfile = dogTemperament.length > 0 || dog.diet_preference || dogAllergies.length > 0 || dog.bio;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafb" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-12" style={{ backgroundColor: "#0a2e30" }}>
        <Link href="/"><img src="/weblogo.png" alt="DogCareGH" className="h-11 w-auto md:h-[4.5rem]" /></Link>
        <Link href="/dashboard/owner" className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10">
          ← Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-lg px-4 py-8 md:px-6">

        {/* ── VIEW MODE ── */}
        {!editing && (
          <div className="space-y-4">

            {/* Hero card */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="h-2 w-full" style={{ backgroundColor: avatarBg(dog.id) }} />
              <div className="flex flex-col items-center px-6 pb-7 pt-8 text-center">
                {dog.avatar_url ? (
                  <img src={dog.avatar_url} alt={dog.name} className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
                ) : (
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-2xl text-5xl shadow-lg"
                    style={{ backgroundColor: avatarBg(dog.id) }}
                  >
                    🐕
                  </div>
                )}
                <h1 className="mt-4 text-2xl font-extrabold" style={{ color: "#0a2e30" }}>{dog.name}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {[dog.breed, dog.size ? SIZE_LABEL[dog.size] : null, dog.age != null ? `${dog.age} yrs` : null]
                    .filter(Boolean).join(" · ") || "Add details below"}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={dog.vaccination_status
                      ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                      : { background: "rgba(239,68,68,.1)", color: "#dc2626" }}
                  >
                    {dog.vaccination_status ? "✓ Vaccinated" : "Unvaccinated"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                    {dog.neutered ? "Neutered / Spayed" : "Intact"}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={dog.leash_trained === true
                      ? { background: "rgba(0,176,150,.12)", color: "#00b096" }
                      : dog.leash_trained === false
                        ? { background: "rgba(239,68,68,.1)", color: "#dc2626" }
                        : { background: "#f3f4f6", color: "#9ca3af" }}
                  >
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
                      <span key={t} className="rounded-full px-3 py-1 text-sm font-medium" style={{ border: "1px solid #00b096", background: "rgba(0,176,150,0.08)", color: "#007a66" }}>
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

            {/* Empty nudge */}
            {!hasProfile && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
                <p className="text-2xl mb-2">🐾</p>
                <p className="text-sm font-semibold text-gray-600">Help providers get to know {dog.name}</p>
                <p className="mt-1 text-xs text-gray-400">Add personality, diet, and care notes below.</p>
              </div>
            )}

            <button
              onClick={startEdit}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: "#0a2e30" }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        )}

        {cropSrc && (
          <ImageCropModal
            src={cropSrc}
            onDone={uploadCroppedBlob}
            onCancel={() => setCropSrc(null)}
          />
        )}

        {/* ── EDIT MODE ── */}
        {editing && (
          <div className="space-y-4">

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* Photo */}
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white py-6 shadow-sm">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-24 w-24 rounded-2xl object-cover shadow-md" />
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-2xl text-4xl shadow-md"
                    style={{ backgroundColor: avatarBg(dog.id) }}
                  >
                    🐕
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                    <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-sm shadow" style={{ backgroundColor: "#0a2e30" }}>
                  📷
                </div>
              </button>
              <p className="text-xs text-gray-400">{uploading ? "Uploading…" : "Tap to change photo"}</p>
            </div>

            {/* Name · Breed · Age */}
            <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Name</label>
                <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brownie" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500">Breed</label>
                  <input className={INPUT} list="breed-list" value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Labrador" />
                  <datalist id="breed-list">
                    {BREEDS.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500">Age (years)</label>
                  <input className={INPUT} type="number" min={0} max={30} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 3" />
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold text-gray-500">Size</p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <SingleChip key={s.id} on={size === s.id} onClick={() => setSize(size === s.id ? "" : s.id)}>
                    {s.label}
                  </SingleChip>
                ))}
              </div>
            </div>

            {/* Quick toggles */}
            <div className="grid grid-cols-2 gap-3">
              <ToggleCard on={vaccinated}   onClick={() => setVaccinated(!vaccinated)}     emoji="💉" label="Vaccinated"        sub={vaccinated   ? "Yes" : "No"} />
              <ToggleCard on={neutered}     onClick={() => setNeutered(!neutered)}         emoji="🏥" label="Neutered / Spayed" sub={neutered     ? "Yes" : "No"} />
              <ToggleCard on={leashTrained} onClick={() => setLeashTrained(!leashTrained)} emoji="🦮" label="Leash Trained"     sub={leashTrained ? "Yes" : "No"} />
            </div>

            {/* Personality */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">Personality</p>
              <p className="mb-3 mt-0.5 text-[11px] text-gray-400">Pick all that match</p>
              <div className="flex flex-wrap gap-2">
                {TEMPERAMENT.map(t => (
                  <MultiChip key={t.id} on={temperament.includes(t.id)} onClick={() => setTemperament(toggleArr(temperament, t.id))}>
                    {t.emoji} {t.label}
                  </MultiChip>
                ))}
              </div>
            </div>

            {/* Diet */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">Preferred Diet</p>
              <p className="mb-3 mt-0.5 text-[11px] text-gray-400">Pick one</p>
              <div className="flex flex-wrap gap-2">
                {DIET.map(d => (
                  <SingleChip key={d.id} on={diet === d.id} onClick={() => setDiet(diet === d.id ? "" : d.id)}>
                    {d.emoji} {d.label}
                  </SingleChip>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">Food Allergies</p>
              <p className="mb-3 mt-0.5 text-[11px] text-gray-400">Pick all that apply</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGIES.map(a => (
                  <MultiChip key={a.id} on={allergies.includes(a.id)} onClick={() => setAllergies(toggleArr(allergies, a.id))}>
                    {a.label}
                  </MultiChip>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">About {name || "your dog"}</p>
              <p className="mb-3 mt-0.5 text-[11px] text-gray-400">Optional — anything a provider should know</p>
              <textarea
                className={`${INPUT} resize-none`}
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={300}
                placeholder={`e.g. ${name || "Brownie"} loves swimming but gets nervous around loud noises…`}
              />
              <p className="mt-1 text-right text-[10px] text-gray-400">{bio.length}/300</p>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pb-8">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00b096" }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
