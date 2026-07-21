// PETciti sponsored banner — links out to https://petciti.net.
// Two shapes: "wide" (landscape strip) and "poster" (portrait card).
// Styled to match the DogCareGH card system (rounded-2xl, subtle border + shadow)
// so it blends into whatever page it sits on.

export function PetcitiAd({
  image,
  variant = "wide",
  className = "",
}: {
  image: string;
  variant?: "wide" | "poster";
  className?: string;
}) {
  return (
    <a
      href="https://petciti.net"
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label="PETciti — pet products & supplies. Opens petciti.net in a new tab."
      className={`group relative block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md ${className}`}
    >
      {/* Honest, unobtrusive disclosure label */}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
        Sponsored
      </span>

      <img
        src={image}
        alt="PETciti — pet products & supplies. Visit petciti.net"
        loading="lazy"
        className={
          variant === "wide"
            ? "h-auto w-full object-cover transition duration-300 group-hover:scale-[1.01]"
            : "mx-auto max-h-[26rem] w-full object-contain"
        }
      />
    </a>
  );
}
