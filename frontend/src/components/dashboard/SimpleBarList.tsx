const BAR_COLORS: Record<string, string> = {
  primary: "bg-[var(--primary)]",
  cyan:    "bg-[var(--primary)]",
  violet:  "bg-violet-500",
  blue:    "bg-blue-500",
  accent:  "bg-[var(--accent)]",
};

interface SimpleBarListProps {
  data:    { name: string; value: number }[];
  suffix:  string;
  color?:  string;
}

export default function SimpleBarList({ data, suffix, color = "primary" }: SimpleBarListProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const bar = BAR_COLORS[color] ?? "bg-[var(--primary)]";

  return (
    <ul className="space-y-3.5">
      {data.map((item) => (
        <li key={item.name}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[var(--text-secondary)] text-xs truncate max-w-[60%]">{item.name}</span>
            <span className="text-[var(--text-primary)] text-xs font-semibold tabular-nums shrink-0">
              {item.value} {suffix}
            </span>
          </div>
          <div className="h-1 bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className={`h-full ${bar} rounded-full transition-[width] duration-500`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
