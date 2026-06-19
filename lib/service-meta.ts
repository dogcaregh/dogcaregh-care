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
    description: "Your dog spends the day with a dedicated sitter in their home — attentive, personalised care when you need it most.",
  },
  dog_daycare: {
    emoji: "🏡",
    name: "Dog Daycare",
    description: "Supervised play and socialisation in a home setting. Perfect for active dogs who enjoy company and stimulation during the day.",
  },
  dog_boarding: {
    emoji: "🛏️",
    name: "Dog Overnight",
    description: "Your dog stays with a trusted carer for as long as you need — a night, a week, or longer. Ideal for travel and extended time away.",
  },
  dog_grooming: {
    emoji: "✂️",
    name: "Dog Grooming",
    description: "Professional bathing, trimming, and grooming at the carer's home. Keeps your dog clean, healthy, and comfortable.",
  },
};
