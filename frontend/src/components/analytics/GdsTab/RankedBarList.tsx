import { ProgressBar } from "@/components/analytics/shared";
import { RoleBadge } from "./RoleBadge";

const COLOR = {
  amber:  { bar: "bg-amber-400",  label: "text-amber-600"  },
  indigo: { bar: "bg-indigo-400", label: "text-indigo-600" },
} as const;

interface BaseRow {
  company_id: string;
  legal_name: string;
  role:       string;
}

interface Props<T extends BaseRow> {
  rows:     T[];
  getPct:   (row: T) => number;
  getLabel: (row: T) => string;
  color:    keyof typeof COLOR;
}

export function RankedBarList<T extends BaseRow>({ rows, getPct, getLabel, color }: Props<T>) {
  const { bar, label } = COLOR[color];
  return (
    <div className="space-y-4">
      {rows.map((row, i) => {
        const pct = getPct(row);
        return (
          <div key={row.company_id}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 text-xs w-5 shrink-0 tabular-nums">{i + 1}</span>
                <span className="text-gray-900 text-sm truncate">{row.legal_name}</span>
                <RoleBadge role={row.role} />
              </div>
              <span className={`font-mono text-xs font-semibold shrink-0 ${label}`}>
                {getLabel(row)}
              </span>
            </div>
            <ProgressBar pct={pct} colorClass={bar} transition />
          </div>
        );
      })}
    </div>
  );
}