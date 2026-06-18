import type { CrossBuyerRow } from "@/types/analytics";
import { EUR } from "@/lib/analytics";
import { fragilityBadge } from "@/lib/analytics";

interface Props {
  rows: CrossBuyerRow[];
}

export function BuyersTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Comprador", "Región", "Proveedores", "Dependencia top %", "Fact. vencidas", "Exposición vencida (€)"].map((h, i) => (
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
          const dualRisk = row.top_supplier_pct >= 50 && row.overdue_received > 0;
          return (
            <tr
              key={row.buyer}
              className={`transition-colors ${dualRisk ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-gray-50"}`}
            >
              <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px] truncate">
                {dualRisk && <span className="mr-1.5 text-amber-500 text-xs">⚠</span>}
                {row.buyer}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{row.region ?? "—"}</td>
              <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{row.supplier_count}</td>
              <td className="px-4 py-3 text-right">
                <span className={`inline-flex justify-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold min-w-[3.5rem] ${fragilityBadge(row.top_supplier_pct)}`}>
                  {row.top_supplier_pct.toFixed(1)}%
                </span>
              </td>
              <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${row.overdue_received > 0 ? "text-red-600" : "text-gray-400"}`}>
                {row.overdue_received}
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