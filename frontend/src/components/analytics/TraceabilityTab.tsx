"use client";

import { useState } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import type { ExactPathRow, ForwardRow, LineageRow } from "@/types/analytics";
import { EMPTY, DocChain, ForwardRowItem, ShowMoreButton, SectionModal, SectionLabel, KpiStrip } from "./shared";
import { ChainDiagramButton } from "./ChainDiagram";
import { EUR, SIGN, deltaColor, PAGE_SIZE as PAGE } from "@/lib/analytics";

type ModalSection = "exactPaths" | "forward" | "lineage";

function ExactPathsTable({ rows }: { rows: ExactPathRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Cadena documental", "Proveedor", "Desviación (€)", "Eslabones", ""].map((h, i) => (
            <th
              key={`${h}-${i}`}
              className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i > 1 ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => {
          const delta = (row.importe_factura ?? 0) - (row.importe_pedido ?? 0);
          return (
            <tr key={row.factura_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3"><DocChain chain={row.cadena_completa ?? []} /></td>
              <td className="px-4 py-3 text-gray-700 text-sm max-w-[160px] truncate">{row.proveedor}</td>
              <td className={`px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums ${deltaColor(delta)}`}>
                {SIGN(delta)}{EUR(delta, 2)} €
              </td>
              <td className="px-4 py-3 text-gray-400 text-right tabular-nums">{row.saltos_topologicos}</td>
              <td className="px-4 py-3 text-right">
                <ChainDiagramButton row={row} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LineageTable({ rows }: { rows: LineageRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {["Factura", "Riesgo (€)", "Proveedor", "Empresa receptora", "Eslabones", "Productos"].map((h, i) => (
            <th
              key={h}
              className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i > 0 && i !== 2 && i !== 3 ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.factura_id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.factura_id}</td>
            <td className="px-4 py-3 text-left font-mono font-semibold text-red-600 tabular-nums">
              {EUR(row.riesgo_economico, 2)} €
            </td>
            <td className="px-4 py-3 text-gray-900 font-medium max-w-[160px] truncate">{row.proveedor}</td>
            <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{row.afectado}</td>
            <td className="px-4 py-3 text-gray-400 text-right tabular-nums">{row.saltos_topologicos}</td>
            <td className="px-4 py-3 text-gray-400 text-right tabular-nums">
              {row.id_productos_implicados?.length ?? 0}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Props {
  exactPaths: ExactPathRow[];
  forward:    ForwardRow[];
  lineage:    LineageRow[];
}

export function TraceabilityTab({ exactPaths, forward, lineage }: Props) {
  const [modal, setModal] = useState<ModalSection | null>(null);

  // ── Section 01 KPIs ──────────────────────────────────────────
  const chainDeltas     = exactPaths.map((r) => (r.importe_factura ?? 0) - (r.importe_pedido ?? 0));
  const avgDelta        = chainDeltas.length > 0
    ? chainDeltas.reduce((s, d) => s + d, 0) / chainDeltas.length
    : 0;
  const chainsOverDelta = chainDeltas.filter((d) => d > 0).length;

  // ── Section 03 KPIs ──────────────────────────────────────────
  const totalRisk  = lineage.reduce((s, r) => s + r.riesgo_economico,   0);
  const avgHops    = lineage.length > 0
    ? lineage.reduce((s, r) => s + r.saltos_topologicos, 0) / lineage.length
    : 0;

  return (
    <div className="space-y-10">

      {/* ── 01 · CADENAS DOCUMENTALES EXACTAS ───────────────────── */}
      <section>
        <SectionLabel
          index="01 /"
          title="Cadenas Documentales Exactas"
          subtitle={<>Ruta completa desde cada factura con discrepancia hasta el pedido de origen, mostrando la desviación entre el importe acordado y el facturado. Pulsa <EyeIcon className="w-3 h-3 inline mb-0.5 mx-0.5" /> para visualizar el diagrama de nodos de cada cadena.</>}
        />
        {exactPaths.length === 0 ? EMPTY : (
          <>
            <KpiStrip items={[
              { label: "Cadenas trazadas",       value: exactPaths.length.toString()                          },
              { label: "Desviación media",        value: `${SIGN(avgDelta)}${EUR(Math.abs(avgDelta), 2)} €`  },
              { label: "Cadenas con sobrecoste", value: chainsOverDelta.toString()                            },
            ]} />

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <ExactPathsTable rows={exactPaths.slice(0, PAGE)} />
            {exactPaths.length > PAGE && (
              <div className="px-5 pb-4">
                <ShowMoreButton total={exactPaths.length} onClick={() => setModal("exactPaths")} />
              </div>
            )}
            </div>
          </>
        )}
      </section>

      {/* ── 02 · TRAZABILIDAD DIRECTA ───────────────────────────── */}
      <section>
        <SectionLabel
          index="02 /"
          title="Trazabilidad Directa (Pedido → Documentos)"
          subtitle="Pedidos ordenados por nivel de incidencia. Expande cada fila para ver los documentos de cumplimiento asociados, su estado y si existen desviaciones respecto al pedido original."
        />
        {forward.length === 0 ? EMPTY : (
          <div>
            <div className="space-y-2">
              {forward.slice(0, PAGE).map((row) => (
                <ForwardRowItem key={row.pedido_id} row={row} />
              ))}
            </div>
            {forward.length > PAGE && (
              <div className="mt-3">
                <ShowMoreButton total={forward.length} onClick={() => setModal("forward")} />
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 03 · TRAZABILIDAD INVERSA ───────────────────────────── */}
      <section>
        <SectionLabel
          index="03 /"
          title="Trazabilidad Inversa (Factura → Pedido)"
          subtitle="Facturas con discrepancia trazadas hasta su pedido de origen, ordenadas por riesgo económico. Permite identificar qué operaciones presentan mayor exposición financiera no resuelta y cuántos documentos intermedios separan la factura de su origen."
        />
        {lineage.length === 0 ? EMPTY : (
          <>
            <KpiStrip items={[
              { label: "Facturas trazadas",      value: lineage.length.toString()       },
              { label: "Riesgo económico total", value: `${EUR(totalRisk, 0)} €`       },
              { label: "Eslabones medios",       value: `${avgHops.toFixed(1)} nodos`  },
            ]} />

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <LineageTable rows={lineage.slice(0, PAGE)} />
            {lineage.length > PAGE && (
              <div className="px-5 pb-4">
                <ShowMoreButton total={lineage.length} onClick={() => setModal("lineage")} />
              </div>
            )}
            </div>
          </>
        )}
      </section>

      {/* ── MODALS ──────────────────────────────────────────────── */}
      <SectionModal title="Cadenas Documentales Exactas — completo" open={modal === "exactPaths"} onClose={() => setModal(null)}>
        <ExactPathsTable rows={exactPaths} />
      </SectionModal>

      <SectionModal title="Trazabilidad Directa — completo" open={modal === "forward"} onClose={() => setModal(null)}>
        <div className="space-y-2">
          {forward.map((row) => <ForwardRowItem key={row.pedido_id} row={row} />)}
        </div>
      </SectionModal>

      <SectionModal title="Trazabilidad Inversa — completo" open={modal === "lineage"} onClose={() => setModal(null)}>
        <LineageTable rows={lineage} />
      </SectionModal>

    </div>
  );
}