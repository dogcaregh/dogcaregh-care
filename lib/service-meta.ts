export type ServiceSlug =
  | "dog_walking"
  | "dog_sitting"
  | "dog_daycare"
  | "dog_boarding"
  | "dog_grooming";

export const SERVICE_META: Record<ServiceSlug, { emoji: string; name: string; description: string }> = {
  dog_walking: {
    emoji: "🦮",
    name: "Dog Walking",
    description: "A professional walker takes your dog for a structured walk. Great for daily exercise when you're at work or tied up.",
  },
  dog_sitting: {
    emoji: "🐾",
    name: "Dog Sitting",
    description: "A trusted sitter comes to your home to care for your dog in their own familiar environment — less stress, more comfort.",
  },
  dog_daycare: {
    emoji: "🏡",
    name: "Dog Daycare",
    description: "Your dog spends the day at the care provider's home — supervised play, socialisation, and company while you're out.",
  },
  dog_boarding: {
    emoji: "🛏️",
    name: "Dog Overnight",
    description: "Your dog stays with a trusted care provider for as long as you need — a night, a week, or longer. Ideal for travel and extended time away.",
  },
  dog_grooming: {
    emoji: "✂️",
    name: "Dog Grooming",
    description: "Professional bathing, trimming, and grooming — visit the groomer's place or have a mobile groomer come to you.",
  },
};
