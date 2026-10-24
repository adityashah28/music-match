"use client";

const OPTIONS = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Not going" },
] as const;

export function RsvpControl({
  value,
  onChange,
}: {
  value: "going" | "maybe" | "not_going" | null;
  onChange: (next: "going" | "maybe" | "not_going") => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="RSVP"
      className="flex w-full gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-normal whitespace-nowrap transition-colors duration-200 ${
              selected
                ? "bg-[var(--foreground)] text-white"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <OptionIcon value={option.value} selected={selected} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function OptionIcon({
  value,
  selected,
}: {
  value: (typeof OPTIONS)[number]["value"];
  selected: boolean;
}) {
  const color = value === "going" ? "#16a34a" : value === "maybe" ? "#2563eb" : "#e11d48";
  const common = {
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    className: "h-4 w-4 shrink-0",
    fill: "none",
    stroke: selected ? (value === "going" || value === "maybe" || value === "not_going" ? "#fff" : color) : "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (value === "going") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12.2 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (value === "maybe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.2 9.4a2.8 2.8 0 1 1 3.6 2.7c-.7.3-1.1.8-1.1 1.5" />
        <path d="M11.7 16.6h.1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}
