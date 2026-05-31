"use client";

import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import type { MacroStats } from "@/types/dashboard";

type Props = {
  econVol:   MacroStats["economic_volume"];
  docHealth: MacroStats["document_health"];
};

const formatEUR = (n: number) =>
  Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR",
    notation: "compact", maximumFractionDigits: 1,
  }).format(n);

export default function HealthStrip({ econVol, docHealth }: Props) {
  return (
    <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">

      {/* Volumen Bruto Total */}
      <div className="relative overflow-hidden bg-white/[0.04] rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-emerald-500/10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/40 to-transparent" />
        <div className="p-2.5 bg-emerald-500/10 rounded-xl shrink-0">
          <BanknotesIcon className="w-5 h-5 text-emerald-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] text-[0.65rem] uppercase font-semibold tracking-[0.1em] leading-tight">
            Volumen Bruto Total
          </p>
          <p className="text-emerald-400 text-2xl font-black mt-0.5 tabular-nums">
            {econVol.total_gross_eur != null ? formatEUR(econVol.total_gross_eur) : "—"}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] font-mono mt-0.5">
            {econVol.invoice_count != null
              ? `${econVol.invoice_count.toLocaleString("es")} facturas emitidas`
              : ""}
          </p>
        </div>
      </div>

      {/* Docs con Discrepancia */}
      <div className="relative overflow-hidden bg-white/[0.04] rounded-2xl border border-red-500/20 hover:border-red-500/40 p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-red-500/10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/40 to-transparent" />
        <div className="p-2.5 bg-red-500/10 rounded-xl shrink-0">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] text-[0.65rem] uppercase font-semibold tracking-[0.1em] leading-tight">
            Docs con Discrepancia
          </p>
          <p className="text-red-400 text-2xl font-black mt-0.5 tabular-nums">
            {docHealth.flagged_documents.toLocaleString("es")}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] font-mono mt-0.5">
            de {docHealth.total_documents.toLocaleString("es")} documentos totales
          </p>
        </div>
      </div>

      {/* Tasa Global Discrepancia */}
      <div className="relative overflow-hidden bg-white/[0.04] rounded-2xl border border-amber-500/20 hover:border-amber-500/40 p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-amber-500/10">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
        <div className="p-2.5 bg-amber-500/10 rounded-xl shrink-0">
          <SignalIcon className="w-5 h-5 text-amber-400" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] text-[0.65rem] uppercase font-semibold tracking-[0.1em] leading-tight">
            Tasa Global Discrepancia
          </p>
          <p className="text-amber-400 text-2xl font-black mt-0.5 tabular-nums">
            {docHealth.overall_discrepancy_rate_pct}%
          </p>
          <p className="text-[var(--text-muted)] text-[10px] font-mono mt-0.5">
            sobre el total de documentos
          </p>
        </div>
      </div>

    </div>
  );
}