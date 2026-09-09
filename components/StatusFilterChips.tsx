export type MeetingStatusFilter = "all" | "upcoming" | "past";

const OPTIONS: Array<{
  value: MeetingStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Wszystkie" },
  { value: "upcoming", label: "Zaplanowane" },
  { value: "past", label: "Wcześniejsze" },
];

export function StatusFilterChips({
  value,
  onChange,
}: {
  value: MeetingStatusFilter;
  onChange: (value: MeetingStatusFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtruj spotkania"
      className="flex flex-wrap gap-2"
    >
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
