import type { CrossSupplierRow } from "@/types/analytics";
import { EUR } from "@/lib/analytics";
import { riskScoreBadge } from "@/lib/analytics";

interface Props {
  rows: CrossSupplierRow[];
}

export function SuppliersTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Proveedor", "Región", "Score", "Discrepancia %", "Fact. vencidas", "Importe vencido (€)"].map((h, i) => (
            <th
              key={h}
              className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i > 1 ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => {
          const dualRisk = row.risk_score >= 40 && row.overdue_count > 0;
          return (
            <tr
              key={row.supplier}
              className={`transition-colors ${dualRisk ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-gray-50"}`}
            >
              <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px] truncate">
                {dualRisk && <span className="mr-1.5 text-red-500 text-xs">⚠</span>}
                {row.supplier}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{row.region ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <span className={`inline-flex justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold min-w-[3rem] ${riskScoreBadge(row.risk_score)}`}>
                  {row.risk_score.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{row.discrepancy_pct.toFixed(1)}%</td>
              <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${row.overdue_count > 0 ? "text-red-600" : "text-gray-400"}`}>
                {row.overdue_count}
              </td>
              <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.overdue_eur > 0 ? "text-red-600" : "text-gray-400"}`}>
                {row.overdue_eur > 0 ? `${EUR(row.overdue_eur, 2)} €` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}