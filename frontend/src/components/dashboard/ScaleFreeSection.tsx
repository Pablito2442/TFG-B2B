"use client";

import { CpuChipIcon } from "@heroicons/react/24/outline";
import SectionHeader from "@/components/dashboard/SectionHeader";
import type { ScaleFreeMetrics } from "@/types/dashboard";

interface ScaleFreeSectionProps {
  scaleFree: Partial<ScaleFreeMetrics>;
}

export default function ScaleFreeSection({ scaleFree }: ScaleFreeSectionProps) {
  const giniVal  = scaleFree.gini_coefficient ?? null;
  const ratioVal = scaleFree.max_mean_ratio   ?? null;

  if (giniVal === null) return null;

  const giniColor = giniVal > 0.5 ? "text-emerald-400"
    : giniVal > 0.3               ? "text-amber-400"
    :                                "text-red-400";
  const giniHint  = giniVal > 0.5 ? "Scale-free confirmado"
    : giniVal > 0.3               ? "Desigualdad moderada"
    :                                "Distribución uniforme";

  const ratioColor = ratioVal === null ? "text-[var(--text-muted)]"
    : ratioVal > 5                     ? "text-emerald-400"
    : ratioVal > 3                     ? "text-amber-400"
    :                                    "text-red-400";
  const ratioHint  = ratioVal === null ? "Sin datos"
    : ratioVal > 5                     ? "Cola pesada — power-law"
    : ratioVal > 3                     ? "Cola moderada"
    :                                    "Cola ligera";

  return (
    <div className="animate-fade-up bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
      <SectionHeader
        icon={CpuChipIcon}
        title="Validación Topológica LFR"
        subtitle="Indicadores de distribución power-law sobre la red SUPPLIES generada."
        iconColor="text-sky-400"
        iconBg="bg-sky-500/10"
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">

        <div className="px-4 py-4 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl">
          <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wide mb-2">
            Coef. Gini
          </p>
          <p className={`text-2xl font-black tabular-nums ${giniColor}`}>
            {giniVal.toFixed(4)}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${giniColor}`}>{giniHint}</p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            &gt;0.5 confirma red libre de escala
          </p>
        </div>

        <div className="px-4 py-4 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl">
          <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wide mb-2">
            Nodos Hub
          </p>
          <p className="text-2xl font-black tabular-nums text-sky-400">
            {scaleFree.hub_count ?? "—"}
          </p>
          <p className="text-[11px] mt-1 font-medium text-sky-400">Cuellos de botella</p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            grado &gt; μ + 2σ ({scaleFree.hub_threshold ?? "—"})
          </p>
        </div>

        <div className="px-4 py-4 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl">
          <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wide mb-2">
            Ratio Max/Media
          </p>
          <p className={`text-2xl font-black tabular-nums ${ratioColor}`}>
            {ratioVal !== null ? `${ratioVal}×` : "—"}
          </p>
          <p className={`text-[11px] mt-1 font-medium ${ratioColor}`}>{ratioHint}</p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            &gt;5× indica distribución power-law
          </p>
        </div>

        <div className="px-4 py-4 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl">
          <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wide mb-2">
            Grado Medio
          </p>
          <p className="text-2xl font-black tabular-nums text-violet-400">
            {scaleFree.mean_degree ?? "—"}
          </p>
          <p className="text-[11px] mt-1 font-medium text-violet-400">
            Máx: {scaleFree.max_degree ?? "—"} · Mín: {scaleFree.min_degree ?? "—"}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            σ = {scaleFree.std_degree ?? "—"}
          </p>
        </div>

      </div>
    </div>
  );
}