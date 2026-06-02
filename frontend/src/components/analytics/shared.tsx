"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Text, Badge } from "@tremor/react";
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ExactPathRow, ForwardRow } from "@/types/analytics";

export const EUR = (n: number, dec = 0) =>
  Intl.NumberFormat("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

export const SIGN = (n: number) => (n > 0 ? "+" : "");

export function rateBadge(rate: number): "red" | "yellow" | "emerald" {
  if (rate >= 20) return "red";
  if (rate >= 10) return "yellow";
  return "emerald";
}

export const DOC_COLORS: Record<string, string> = {
  INVOICE:     "bg-red-900/60 text-red-300 border-red-700",
  ORDER:       "bg-blue-900/60 text-blue-300 border-blue-700",
  SHIPMENT:    "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  CREDIT_NOTE: "bg-amber-900/60 text-amber-300 border-amber-700",
};

export const ESTADO_STYLE: Record<string, string> = {
  SOBREFACTURADO: "bg-red-900/50 text-red-300 border-red-700",
  SUBFACTURADO:   "bg-amber-900/50 text-amber-300 border-amber-700",
  CONFORME:       "bg-emerald-900/50 text-emerald-300 border-emerald-700",
};

export const EMPTY = (
  <Text className="text-slate-500 py-8 text-center">
    Sin datos — ejecuta el pipeline desde{" "}
    <a href="/pipeline" className="text-[var(--primary)] underline">Pipeline</a>.
  </Text>
);

export function DocChip({ tipo, discrepancy }: { tipo: string; discrepancy: boolean }) {
  const cls = DOC_COLORS[tipo] ?? "bg-slate-800 text-slate-300 border-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-mono ${cls}`}>
      {discrepancy && <span className="text-red-400">⚠</span>}
      {tipo}
    </span>
  );
}

export function DocChain({ chain }: { chain: ExactPathRow["cadena_completa"] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chain.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1">
          <DocChip tipo={node.tipo} discrepancy={node.discrepancy} />
          {i < chain.length - 1 && (
            <ArrowRightIcon className="w-3 h-3 text-slate-500 shrink-0" />
          )}
        </span>
      ))}
    </div>
  );
}

export function EstadoPill({ estado }: { estado: string }) {
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${ESTADO_STYLE[estado] ?? "bg-slate-800 text-slate-400 border-slate-600"}`}>
      {estado}
    </span>
  );
}

export function ShowMoreButton({ total, onClick }: { total: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full py-2 text-[11px] font-semibold rounded-lg border border-white/[0.07] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-all"
    >
      Ver todos ({total}) →
    </button>
  );
}

export function SectionModal({
  title, open, onClose, children,
}: {
  title: string; open: boolean; onClose: () => void; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl bg-[#13151f] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <p className="text-white font-bold text-base">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ForwardRowItem({ row }: { row: ForwardRow }) {
  const [open, setOpen] = useState(false);
  const allClean = row.docs_con_discrepancia === 0;
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1d28] hover:bg-[#22253a] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {open
            ? <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
          }
          <span className="font-mono text-xs text-slate-400 shrink-0">{row.pedido_id}</span>
          <span className="text-white text-sm truncate">{row.proveedor}</span>
          <span className="text-slate-500 text-xs">→ {row.comprador}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-slate-400 text-xs">{row.total_docs_cumplimiento} docs</span>
          {allClean
            ? <Badge color="emerald">Sin conflictos</Badge>
            : <Badge color="red">{row.docs_con_discrepancia} conflicto{row.docs_con_discrepancia > 1 ? "s" : ""}</Badge>
          }
          <span className="text-[var(--primary)] font-mono text-sm">{EUR(row.importe_pedido_eur, 2)} €</span>
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 bg-[#13151f] border-t border-slate-800 flex flex-wrap gap-2">
          {row.documentos_cumplimiento.map((doc) => (
            <DocChip key={doc.id} tipo={doc.tipo} discrepancy={doc.discrepancy} />
          ))}
        </div>
      )}
    </div>
  );
}
