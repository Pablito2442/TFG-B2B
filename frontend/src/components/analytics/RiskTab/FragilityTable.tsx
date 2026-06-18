"use client";

import type { BuyerFragilityRow } from "@/types/analytics";
import { EUR } from "@/lib/analytics";

export function FragilityTable({ rows }: { rows: BuyerFragilityRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Comprador", "Región", "Proveedores", "Dependencia Top %", "Volumen Total (€)"].map((h, i) => (
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
        {rows.map((row) => (
          <tr key={row.buyer} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px] truncate">{row.buyer}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">{row.region}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{row.supplier_count}</td>
            <td className="px-4 py-3 text-right">
              <span className={`inline-flex justify-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold min-w-[3rem] ${
                row.top_supplier_pct >= 80 ? "bg-red-50 text-red-600"
                : row.top_supplier_pct >= 50 ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
              }`}>
                {row.top_supplier_pct.toFixed(1)}%
              </span>
            </td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">
              {EUR(row.total_volume_eur, 0)} €
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}