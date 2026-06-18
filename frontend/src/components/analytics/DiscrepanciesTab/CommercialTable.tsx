import type { CommercialImpactRow } from "@/types/analytics";
import { EUR, SIGN, deltaColor } from "@/lib/analytics";
import { EstadoPill } from "@/components/analytics/shared";

interface Props {
  rows: CommercialImpactRow[];
}

export function CommercialTable({ rows }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["ID Pedido", "Proveedor", "Importe pedido (€)", "Total facturado (€)", "Desviación €", "Desviación %", "Resultado"].map((h, i) => (
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
          <tr key={row.pedido_id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.pedido_id}</td>
            <td className="px-4 py-3 text-gray-900 font-medium max-w-[160px] truncate">{row.proveedor}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{EUR(row.importe_pedido_eur, 2)}</td>
            <td className="px-4 py-3 text-right font-mono text-gray-600 tabular-nums">{EUR(row.total_facturado_eur, 2)}</td>
            <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${deltaColor(row.delta_eur)}`}>
              {SIGN(row.delta_eur)}{EUR(row.delta_eur, 2)}
            </td>
            <td className={`px-4 py-3 text-right font-mono tabular-nums ${row.delta_pct != null ? deltaColor(row.delta_pct) : "text-gray-400"}`}>
              {row.delta_pct != null ? `${SIGN(row.delta_pct)}${row.delta_pct}%` : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <EstadoPill estado={row.estado_comercial} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}