"use client";

const BAR_BG: Record<string, string> = {
  red:     "bg-red-100",
  indigo:  "bg-indigo-100",
  violet:  "bg-violet-100",
  emerald: "bg-emerald-100",
  amber:   "bg-amber-100",
  blue:    "bg-blue-100",
};

const BAR_TEXT: Record<string, string> = {
  red:     "text-red-700",
  indigo:  "text-indigo-700",
  violet:  "text-violet-700",
  emerald: "text-emerald-700",
  amber:   "text-amber-700",
  blue:    "text-blue-700",
};

export interface BarItem {
  name:  string;
  value: number;
}

interface BarListProps {
  data:            BarItem[];
  valueFormatter?: (value: number) => string;
  color?:          string;
  showRank?:       boolean;
}

export default function BarList({
  data,
  valueFormatter = (v) => String(v),
  color = "indigo",
  showRank = true,
}: BarListProps) {
  const max    = Math.max(...data.map((d) => d.value), 1);
  const barBg  = BAR_BG[color]   ?? "bg-indigo-100";
  const barTxt = BAR_TEXT[color] ?? "text-indigo-700";

  return (
    <ul className="space-y-1.5">
      {data.map((item, i) => (
        <li key={item.name} className="relative rounded-lg overflow-hidden group">
          {/* Proportional background fill */}
          <div
            className={`absolute inset-y-0 left-0 ${barBg} rounded-lg transition-[width] duration-500`}
            style={{ width: `${(item.value / max) * 100}%` }}
          />
          {/* Row content */}
          <div className="relative flex items-center gap-2 px-3 py-2.5 hover:bg-black/[0.02] transition-colors rounded-lg">
            {showRank && (
              <span className="text-gray-400 text-xs tabular-nums w-4 shrink-0 text-right">
                {i + 1}
              </span>
            )}
            <span
              className="text-gray-800 text-sm truncate shrink-0"
              style={{ maxWidth: `calc(${(item.value / max) * 100}% - 2 rem)` }}
            >
              {item.name}
            </span>
            <span className={`ml-auto font-mono text-sm font-semibold tabular-nums shrink-0 ${barTxt}`}>
              {valueFormatter(item.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}