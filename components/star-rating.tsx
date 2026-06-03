"use client";

interface StarRatingProps {
  value: number;        // 0–5, supports decimals
  size?: "sm" | "md" | "lg";
  interactive?: false;
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
  interactive: true;
}

const SIZE = { sm: "text-sm", md: "text-xl", lg: "text-3xl" };

export function StarRating(props: StarRatingProps | InteractiveStarRatingProps) {
  const { value, size = "sm" } = props;
  const interactive = props.interactive === true;

  return (
    <span className={`inline-flex gap-px leading-none ${SIZE[size]}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={interactive ? () => (props as InteractiveStarRatingProps).onChange(n) : undefined}
          style={{
            color: n <= Math.round(value) ? "#f59e0b" : "#e5e7eb",
            cursor: interactive ? "pointer" : "default",
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

interface RatingBadgeProps {
  avg: number;
  count: number;
  size?: "sm" | "md";
}

export function RatingBadge({ avg, count, size = "sm" }: RatingBadgeProps) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400">
        <span className="text-gray-300">★</span> New
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
        size === "md" ? "text-sm" : "text-xs"
      }`}
      style={{ backgroundColor: "rgba(245,158,11,.1)", color: "#d97706" }}
    >
      <span style={{ color: "#f59e0b" }}>★</span>
      <span>{Number(avg).toFixed(1)}</span>
      <span style={{ color: "#d97706", opacity: 0.6 }}>({count})</span>
    </span>
  );
}
