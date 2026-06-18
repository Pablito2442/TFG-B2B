import type { DiscrepancyRow } from "@/types/analytics";
import { discrepancyBadge as rateColor } from "@/lib/analytics";

interface Props {
  rows: DiscrepancyRow[];
}

export function DiscrepancyTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Proveedor", "Total facturas", "Docs irregulares", "% Discrepancia"].map((h, i) => (
            <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i > 0 ? "text-right" : "text-left"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.supplier} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 text-gray-900 font-medium">{row.supplier}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{row.total.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{row.flagged.toLocaleString()}</td>
            <td className="px-4 py-3 text-right">
              <span className={`inline-flex justify-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold min-w-[3rem] ${rateColor(row.discrepancy_rate_pct)}`}>
                {row.discrepancy_rate_pct}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}