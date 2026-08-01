// The approved marketing email copy. One source of truth for the Bulk Email
// Sender. Every body leads with {{first_name}}; the renderer personalises it.
// Announcements for the unlaunched trainer site have cta: null on purpose.

export type CampaignAudience = "owner" | "caregiver";

export type CampaignTemplate = {
  key: string;
  audience: CampaignAudience;
  title: string;      // admin-facing label in the picker
  subject: string;
  preheader: string;  // hidden inbox-preview line
  heading: string;
  body: string;       // leads with "Hi {{first_name}},"
  cta: { label: string; path: string } | null;
  note?: string;      // admin-only note
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ---------------- OWNERS ----------------
  {
    key: "o1", audience: "owner", title: "Finish your dog's profile",
    subject: "Finish your dog's profile",
    preheader: "There's more you can add now — including personality.",
    heading: "Finish your dog's profile",
    body: "Hi {{first_name}}, the profile you set up at signup was just the basics. Open your dashboard, tap your dog, then Edit Profile — there's a lot more you can add now, including your dog's personality, so a caregiver knows exactly who they're looking after.",
    cta: { label: "Edit your dog's profile", path: "/dashboard/owner" },
  },
  {
    key: "o2", audience: "owner", title: "How Overnight care works",
    subject: "Travelling soon? How Overnight care works",
    preheader: "Your dog, cared for in a trusted caregiver's home.",
    heading: "Travelling soon?",
    body: "Hi {{first_name}}, going away? With Overnight, your dog stays in a trusted caregiver's home and is looked after until you're back. You choose the caregiver, pay securely, and head off knowing they're in good hands.",
    cta: { label: "Find Overnight care", path: "/search" },
  },
  {
    key: "o3", audience: "owner", title: "Dog Sitting explained",
    subject: "A caregiver who comes to your home",
    preheader: "Morning feed, a walk, and an evening feed — at your place.",
    heading: "Care that comes to your home",
    body: "Hi {{first_name}}, with Dog Sitting, a caregiver comes to your home — feeds your dog in the morning, takes them out for a walk, and comes back in the evening to feed again. Ideal for a weekend away, or when you just need the help.",
    cta: { label: "Book a dog sitter", path: "/search" },
  },
  {
    key: "o4", audience: "owner", title: "Book a walk this week",
    subject: "Book your dog a walk this week",
    preheader: "A good walk makes for a happy dog.",
    heading: "Time for a walk?",
    body: "Hi {{first_name}}, a good walk makes for a happy dog. Book a caregiver near you this week, pick a time that suits you, and they'll come to you.",
    cta: { label: "Book a walk", path: "/search" },
  },
  {
    key: "o5", audience: "owner", title: "Mobile grooming",
    subject: "Grooming that comes to your gate",
    preheader: "No trip across town needed.",
    heading: "Grooming at your gate",
    body: "Hi {{first_name}}, no trip across town needed. With Mobile Grooming, a groomer comes to you to wash, tidy and freshen up your dog — right at your gate.",
    cta: { label: "Book mobile grooming", path: "/search" },
  },
  {
    key: "o6", audience: "owner", title: "Doggy daycare",
    subject: "Long day ahead? Try Doggy Daycare",
    preheader: "Company and care until you're free.",
    heading: "Long day ahead?",
    body: "Hi {{first_name}}, when your day runs long, Doggy Daycare gives your dog company and care until you're free. Drop them with a trusted caregiver and pick them up later.",
    cta: { label: "Find daycare", path: "/search" },
  },
  {
    key: "o7", audience: "owner", title: "Choosing a caregiver",
    subject: "How to choose the right caregiver",
    preheader: "Verification, tiers, ratings and reviews.",
    heading: "How to choose the right caregiver",
    body: "Hi {{first_name}}, every caregiver on DogCareGH shows their verification status, tier, rating and reviews from other owners. Take a moment to compare — it's the easiest way to find someone you'll trust with your dog.",
    cta: { label: "Browse caregivers", path: "/search" },
  },
  {
    key: "o8", audience: "owner", title: "How payment works",
    subject: "How payment works on DogCareGH",
    preheader: "MoMo or card, held in escrow, released after the service.",
    heading: "How payment works",
    body: "Hi {{first_name}}, pay easily with MoMo or card. Your money is held safely in escrow and only released to the caregiver after the service is done — so you're covered every step of the way.",
    cta: { label: "See how it works", path: "/how-it-works" },
  },
  {
    key: "o9", audience: "owner", title: "Leave a review",
    subject: "How was it? Leave a review",
    preheader: "A minute of your time helps other owners.",
    heading: "How was it?",
    body: "Hi {{first_name}}, if a caregiver looked after your dog recently, a short review goes a long way — it helps them, and it helps other owners choose well. It only takes a minute.",
    cta: { label: "Leave a review", path: "/dashboard/owner" },
  },
  {
    key: "o10", audience: "owner", title: "Rebook your caregiver",
    subject: "Book your caregiver again",
    preheader: "Familiar faces make for calmer dogs.",
    heading: "Book your caregiver again",
    body: "Hi {{first_name}}, found someone your dog loves? You can book them again in just a few taps. Familiar faces make for calmer, happier dogs.",
    cta: { label: "Rebook now", path: "/dashboard/owner" },
  },
  {
    key: "o11", audience: "owner", title: "Set your location",
    subject: "Set your location for better matches",
    preheader: "Faster replies, shorter trips, better care.",
    heading: "Set your location",
    body: "Hi {{first_name}}, add your location and we'll match you with caregivers nearby — faster replies, shorter trips, better care. It takes a few seconds on your profile.",
    cta: { label: "Set your location", path: "/dashboard/owner/edit" },
  },
  {
    key: "o12", audience: "owner", title: "Add-on services",
    subject: "Little extras your caregiver can add",
    preheader: "From tick removal to a little extra pampering.",
    heading: "Little extras, big difference",
    body: "Hi {{first_name}}, many caregivers offer add-ons alongside the main service — things like a tick removal or a little extra pampering. Look out for them when you book and pick whatever your dog needs.",
    cta: { label: "See what caregivers offer", path: "/search" },
  },
  {
    key: "o13", audience: "owner", title: "Training is coming (announcement)",
    subject: "Dog training is coming to DogCareGH",
    preheader: "Same login, no new account.",
    heading: "Dog training is coming",
    body: "Hi {{first_name}}, training is on the way at train.dogcaregh.com. Same login, no new account — just sign in with the details you already use here. Stand by; we'll let you know the moment it's live.",
    cta: null,
    note: "Announcement for the unlaunched trainer site — no CTA button until it's live.",
  },
  {
    key: "o14", audience: "owner", title: "Refer a fellow owner",
    subject: "Know a dog owner? Refer them",
    preheader: "Help more dogs get great care.",
    heading: "Know a dog owner?",
    body: "Hi {{first_name}}, enjoying DogCareGH? Tell a fellow dog owner. Share your referral and help more dogs get great care.",
    cta: { label: "Refer a friend", path: "/dashboard/owner" },
  },
  {
    key: "o15", audience: "owner", title: "Win-back — haven't seen you in a while",
    subject: "We've missed you (and so have the dogs)",
    preheader: "Your caregivers are here whenever you need them.",
    heading: "We've missed you",
    body: "Hi {{first_name}}, it's been a while! Your caregivers are here whenever you need a walk, a groom, daycare or Overnight care. Come back any time — booking takes just a few taps.",
    cta: { label: "Find care again", path: "/search" },
  },

  // ---------------- CAREGIVERS ----------------
  {
    key: "c1", audience: "caregiver", title: "Finish your verification",
    subject: "Finish your verification to start getting bookings",
    preheader: "Unverified profiles don't receive bookings.",
    heading: "Finish your verification",
    body: "Hi {{first_name}}, you signed up — nice one. But your profile stays hidden from owners until you're verified. Submit your documents so we can confirm your identity; unverified profiles don't receive bookings. It's quick, and it's the one step between you and your first job.",
    cta: { label: "Complete verification", path: "/dashboard/provider/verify" },
  },
  {
    key: "c2", audience: "caregiver", title: "Complete profile + photos",
    subject: "Add photos and complete your profile",
    preheader: "Owners choose caregivers they can picture.",
    heading: "Add photos and complete your profile",
    body: "Hi {{first_name}}, owners choose caregivers they can picture. Add a clear profile photo, a few gallery shots, and a short bio on how you care for dogs. A complete profile gets far more bookings.",
    cta: { label: "Complete your profile", path: "/dashboard/provider/edit" },
  },
  {
    key: "c3", audience: "caregiver", title: "Set services + prices",
    subject: "Set your services and your prices",
    preheader: "You decide what you do and what you charge.",
    heading: "Set your services and prices",
    body: "Hi {{first_name}}, tell owners what you offer — walking, sitting, daycare, Overnight or grooming — and set your own price for each. You're in control of what you do and what you charge.",
    cta: { label: "Set your services", path: "/dashboard/provider/services" },
  },
  {
    key: "c4", audience: "caregiver", title: "Keep availability current",
    subject: "Keep your availability up to date",
    preheader: "Only get requests you can actually take.",
    heading: "Keep your availability current",
    body: "Hi {{first_name}}, owners book around your calendar. Keep it current and block the days you're away, so you only get requests you can actually take.",
    cta: { label: "Update availability", path: "/dashboard/provider" },
  },
  {
    key: "c5", audience: "caregiver", title: "Respond quickly",
    subject: "Quick replies win bookings",
    preheader: "Owners usually go with the first to respond.",
    heading: "Quick replies win bookings",
    body: "Hi {{first_name}}, when a request comes in, a fast reply makes all the difference — owners usually go with the first caregiver who responds. Keep an eye out and reply promptly to lock in more jobs.",
    cta: { label: "View your requests", path: "/dashboard/provider" },
  },
  {
    key: "c6", audience: "caregiver", title: "How you get paid",
    subject: "How and when you get paid",
    preheader: "Held in escrow, released after the service.",
    heading: "How and when you get paid",
    body: "Hi {{first_name}}, owners pay upfront and the money is held safely in escrow. Once you complete the service, your payout is released — and you can cash out to your MoMo. Simple and secure.",
    cta: { label: "See your earnings", path: "/dashboard/provider" },
  },
  {
    key: "c7", audience: "caregiver", title: "Understanding tiers",
    subject: "Understanding provider tiers",
    preheader: "Complete bookings, earn reviews, stand out.",
    heading: "Understanding provider tiers",
    body: "Hi {{first_name}}, your tier reflects your standing on DogCareGH — complete more bookings and earn good reviews, and you stand out more to owners. Keep delivering great care and let your tier climb.",
    cta: { label: "View your profile", path: "/dashboard/provider/profile" },
  },
  {
    key: "c8", audience: "caregiver", title: "Ask for reviews",
    subject: "Ask happy clients for a review",
    preheader: "The fastest way to win an owner's trust.",
    heading: "Ask happy clients for a review",
    body: "Hi {{first_name}}, reviews are the fastest way to win an owner's trust. After a job well done, ask your client to leave one — a handful of good reviews makes you the easy choice.",
    cta: { label: "See your reviews", path: "/dashboard/provider" },
  },
  {
    key: "c9", audience: "caregiver", title: "Offer more than one service",
    subject: "Offer more than one service, stay busier",
    preheader: "More services means more owners see you.",
    heading: "Offer more than one service",
    body: "Hi {{first_name}}, caregivers who offer a few services — say walking and daycare, or sitting and Overnight — get seen by more owners and stay busier. Add another service to widen your reach.",
    cta: { label: "Add a service", path: "/dashboard/provider/services" },
  },
  {
    key: "c10", audience: "caregiver", title: "For trainers (announcement)",
    subject: "Trainers — train.dogcaregh.com is coming",
    preheader: "Same login, no new account.",
    heading: "Trainers, there's more coming",
    body: "Hi {{first_name}}, if you train dogs, there's more on the way. train.dogcaregh.com launches soon, and you'll sign in with the same login you use here — no new account. Stand by; we'll tell you when it opens.",
    cta: null,
    note: "Announcement for the unlaunched trainer site — no CTA button until it's live.",
  },
];

export const templateByKey = (key: string): CampaignTemplate | undefined =>
  CAMPAIGN_TEMPLATES.find((t) => t.key === key);
