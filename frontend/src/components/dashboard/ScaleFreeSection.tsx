"use client";

import { CpuChipIcon } from "@heroicons/react/24/outline";
import SectionHeader from "@/components/ui/SectionHeader";
import type { ScaleFreeMetrics } from "@/types/dashboard";

interface ScaleFreeSectionProps {
  scaleFree: Partial<ScaleFreeMetrics>;
}

const METRICS_CONFIG: {
  label:    string;
  getValue: (sf: Partial<ScaleFreeMetrics>) => string;
  getColor: (sf: Partial<ScaleFreeMetrics>) => string;
  getHint:  (sf: Partial<ScaleFreeMetrics>) => string;
  getSub:   (sf: Partial<ScaleFreeMetrics>) => string;
}[] = [
  {
    label:    "Coef. Gini",
    getValue: (sf) => (sf.gini_coefficient ?? null)?.toFixed(4) ?? "—",
    getColor: (sf) => {
      const v = sf.gini_coefficient ?? null;
      return v === null ? "text-gray-400" : v > 0.5 ? "text-emerald-600" : v > 0.3 ? "text-amber-600" : "text-red-500";
    },
    getHint:  (sf) => {
      const v = sf.gini_coefficient ?? null;
      return v === null ? "Sin datos" : v > 0.5 ? "Scale-free confirmado" : v > 0.3 ? "Desigualdad moderada" : "Distribución uniforme";
    },
    getSub:   () => ">0.5 confirma red libre de escala",
  },
  {
    label:    "Nodos Hub",
    getValue: (sf) => String(sf.hub_count ?? "—"),
    getColor: (sf) => {
      const v = sf.hub_count ?? 0;
      return v === 0 ? "text-gray-400" : v <= 5 ? "text-emerald-600" : v <= 15 ? "text-amber-600" : "text-red-500";
    },
    getHint:  (sf) => {
      const v = sf.hub_count ?? 0;
      return v === 0 ? "Sin hubs detectados" : v <= 5 ? "Topología saludable" : v <= 15 ? "Riesgo moderado" : "Alta concentración";
    },
    getSub:   (sf) => `grado > μ + 2σ (${sf.hub_threshold ?? "—"})`,
  },
  {
    label:    "Ratio Max/Media",
    getValue: (sf) => {
      const v = sf.max_mean_ratio ?? null;
      return v !== null ? `${v}×` : "—";
    },
    getColor: (sf) => {
      const v = sf.max_mean_ratio ?? null;
      return v === null ? "text-gray-400" : v > 5 ? "text-emerald-600" : v > 3 ? "text-amber-600" : "text-red-500";
    },
    getHint:  (sf) => {
      const v = sf.max_mean_ratio ?? null;
      return v === null ? "Sin datos" : v > 5 ? "Cola pesada - power-law" : v > 3 ? "Cola moderada" : "Cola ligera";
    },
    getSub:   () => ">5× indica distribución power-law",
  },
  {
    label:    "Grado Medio",
    getValue: (sf) => String(sf.mean_degree ?? "—"),
    getColor: (sf) => {
      const v = sf.mean_degree ?? null;
      return v === null ? "text-gray-400" : v < 2 ? "text-amber-600" : v <= 6 ? "text-emerald-600" : "text-indigo-600";
    },
    getHint:  (sf) => {
      const v = sf.mean_degree ?? null;
      return v === null ? "Sin datos" : v < 2 ? "Red dispersa" : v <= 6 ? "Conectividad típica" : "Red densa";
    },
    getSub:   (sf) => `σ = ${sf.std_degree ?? "—"} · Máx: ${sf.max_degree ?? "—"} · Mín: ${sf.min_degree ?? "—"}`,
  },
];

export default function ScaleFreeSection({ scaleFree }: ScaleFreeSectionProps) {
  if (scaleFree.gini_coefficient == null) return null;

  return (
    <div className="animate-fade-up bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <SectionHeader
        icon={CpuChipIcon}
        title="Validación Topológica LFR"
        subtitle="Indicadores de distribución power-law sobre la red generada."
        iconColor="text-gray-500"
        iconBg="bg-gray-100"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
        {METRICS_CONFIG.map((m) => (
          <div key={m.label} className="px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-wide mb-2">
              {m.label}
            </p>
            <p className="text-2xl font-black tabular-nums text-gray-900">
              {m.getValue(scaleFree)}
            </p>
            <p className={`text-[11px] mt-1 font-medium ${m.getColor(scaleFree)}`}>
              {m.getHint(scaleFree)}
            </p>
            <p className="text-gray-400 text-[10px] mt-0.5">
              {m.getSub(scaleFree)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}