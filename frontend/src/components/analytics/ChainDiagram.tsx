"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ChainNode, ExactPathRow } from "@/types/analytics";
import { EUR, SIGN } from "@/lib/analytics";

// ── Style map ─────────────────────────────────────────────────────────────────

const NODE_STYLE: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  INVOICE:     { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     badge: "bg-red-100" },
  ORDER:       { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    badge: "bg-blue-100" },
  SHIPMENT:    { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100" },
  CREDIT_NOTE: { bg: "bg-amber-50",  border: "border-amber-200",   text: "text-amber-700",   badge: "bg-amber-100" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: ChainNode }) {
  const s = NODE_STYLE[node.tipo] ?? { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-100" };
  return (
    <div className={`rounded-xl border-2 p-3 w-44 shrink-0 flex flex-col gap-1 ${s.bg} ${node.discrepancy ? "border-red-400 shadow-sm shadow-red-100" : s.border}`}>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold self-start ${s.badge} ${s.text}`}>
        {node.discrepancy && "⚠ "}
        {node.tipo}
      </span>
      <span className="text-gray-700 text-[11px] font-mono truncate" title={node.id}>
        …{node.id.slice(-10)}
      </span>
      {node.importe != null && (
        <span className={`text-sm font-semibold ${node.discrepancy ? "text-red-600" : "text-gray-900"}`}>
          {EUR(node.importe, 2)} €
        </span>
      )}
      {node.fecha  && <span className="text-gray-400 text-[10px]">{node.fecha}</span>}
      {node.estado && <span className="text-gray-500 text-[10px] truncate">{node.estado}</span>}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center shrink-0 px-2">
      <div className="w-8 h-px bg-gray-300" />
      <div className="border-t-[5px] border-b-[5px] border-l-[7px] border-t-transparent border-b-transparent border-l-gray-300" />
    </div>
  );
}

function ChainDiagramModal({ row, onClose }: { row: ExactPathRow; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const chain = row.cadena_completa ?? [];
  const delta = (row.importe_factura ?? 0) - (row.importe_pedido ?? 0);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-gray-900 font-bold text-base">Cadena de Trazabilidad</p>
            <p className="text-gray-400 text-xs mt-0.5 font-mono">
              {row.factura_id} → {row.pedido_original}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
          {[
            { label: "Proveedor",       value: row.proveedor,                      cls: "text-gray-900" },
            { label: "Afectado",        value: row.afectado,                       cls: "text-gray-900" },
            { label: "Δ Importe",       value: `${SIGN(delta)}${EUR(delta, 2)} €`,
              cls: delta > 0 ? "text-red-600 font-semibold font-mono" : delta < 0 ? "text-amber-600 font-semibold font-mono" : "text-emerald-600 font-mono" },
            { label: "Saltos FULFILLS", value: String(row.saltos_topologicos),     cls: "text-gray-900 font-mono" },
          ].map(({ label, value, cls }) => (
            <div key={label}>
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
              <p className={`text-sm ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Diagram */}
        <div className="px-6 py-8 bg-gray-50 overflow-x-auto">
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
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-wrap gap-2 text-[10px]">
            {Object.entries(NODE_STYLE).map(([tipo, s]) => (
              <span key={tipo} className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono ${s.badge} ${s.text}`}>
                {tipo}
              </span>
            ))}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded font-mono border border-red-300 text-red-500 bg-red-50">
              ⚠ discrepancia
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono shrink-0 ml-4">{chain.length} nodos</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ChainDiagramButton({ row }: { row: ExactPathRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs"
        title="Ver diagrama de trazabilidad"
      >
        <EyeIcon className="w-3.5 h-3.5" />
        Ver
      </button>
      {open && <ChainDiagramModal row={row} onClose={() => setOpen(false)} />}
    </>
  );
}