"use client";

import { useState } from "react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ChainNode, ExactPathRow } from "@/types/analytics";
import { EUR, SIGN } from "./shared";

// ── Style map ─────────────────────────────────────────────────────────────────

const NODE_STYLE: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  INVOICE:     { bg: "bg-red-900/30",     border: "border-red-700",     text: "text-red-300",     badge: "bg-red-900/60" },
  ORDER:       { bg: "bg-blue-900/30",    border: "border-blue-700",    text: "text-blue-300",    badge: "bg-blue-900/60" },
  SHIPMENT:    { bg: "bg-emerald-900/30", border: "border-emerald-700", text: "text-emerald-300", badge: "bg-emerald-900/60" },
  CREDIT_NOTE: { bg: "bg-amber-900/30",  border: "border-amber-700",   text: "text-amber-300",   badge: "bg-amber-900/60" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: ChainNode }) {
  const s = NODE_STYLE[node.tipo] ?? { bg: "bg-slate-800/60", border: "border-slate-600", text: "text-slate-300", badge: "bg-slate-700" };
  return (
    <div className={`rounded-xl border-2 p-3 w-44 shrink-0 flex flex-col gap-1 ${s.bg} ${node.discrepancy ? "border-red-500 shadow-lg shadow-red-500/20" : s.border}`}>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold self-start ${s.badge} ${s.text}`}>
        {node.discrepancy && "⚠ "}
        {node.tipo}
      </span>
      <span className="text-white text-[11px] font-mono truncate" title={node.id}>
        …{node.id.slice(-10)}
      </span>
      {node.importe != null && (
        <span className={`text-sm font-semibold ${node.discrepancy ? "text-red-400" : "text-slate-100"}`}>
          {EUR(node.importe, 2)} €
        </span>
      )}
      {node.fecha  && <span className="text-slate-500 text-[10px]">{node.fecha}</span>}
      {node.estado && <span className="text-slate-400 text-[10px] truncate">{node.estado}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center shrink-0 px-2">
      <div className="w-8 h-px bg-slate-600" />
      <div className="border-t-[5px] border-b-[5px] border-l-[7px] border-t-transparent border-b-transparent border-l-slate-600" />
    </div>
  );
}

function ChainDiagramModal({ row, onClose }: { row: ExactPathRow; onClose: () => void }) {
  const chain = row.cadena_completa ?? [];
  const delta = (row.importe_factura ?? 0) - (row.importe_pedido ?? 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#0f111a] border border-slate-700 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-white font-bold text-base">Cadena de Trazabilidad</p>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">
              {row.factura_id} → {row.pedido_original}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-slate-800">
          {[
            { label: "Proveedor",       value: row.proveedor,                    cls: "text-white" },
            { label: "Afectado",        value: row.afectado,                     cls: "text-white" },
            { label: "Δ Importe",       value: `${SIGN(delta)}${EUR(delta, 2)} €`,
              cls: delta > 0 ? "text-red-400 font-semibold font-mono" : delta < 0 ? "text-amber-400 font-semibold font-mono" : "text-emerald-400 font-mono" },
            { label: "Saltos FULFILLS", value: String(row.saltos_topologicos),   cls: "text-white font-mono" },
          ].map(({ label, value, cls }) => (
            <div key={label}>
              <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
              <p className={`text-sm ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Diagram */}
        <div className="px-6 py-8 overflow-x-auto">
          <div className="flex items-start min-w-max">
            {chain.map((node, i) => (
              <span key={node.id} className="flex items-center">
                <NodeCard node={node} />
                {i < chain.length - 1 && <Arrow />}
              </span>
            ))}
          </div>
        </div>

        {/* Legend + node count */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-2 text-[10px]">
            {Object.entries(NODE_STYLE).map(([tipo, s]) => (
              <span key={tipo} className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono ${s.badge} ${s.text}`}>
                {tipo}
              </span>
            ))}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono border border-red-500 text-red-400">
              ⚠ discrepancia
            </span>
          </div>
          <p className="text-[10px] text-slate-600 font-mono shrink-0 ml-4">{chain.length} nodos</p>
        </div>
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ChainDiagramButton({ row }: { row: ExactPathRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 hover:bg-white/[0.04] transition-all text-xs"
        title="Ver diagrama de trazabilidad"
      >
        <EyeIcon className="w-3.5 h-3.5" />
        Ver
      </button>
      {open && <ChainDiagramModal row={row} onClose={() => setOpen(false)} />}
    </>
  );
}
