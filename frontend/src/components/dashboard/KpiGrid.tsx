"use client";

import {
  BuildingOffice2Icon,
  CubeIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

const KPI_CONFIG = [
  {
    label:     "Empresas Activas",
    key:       "Company",
    icon:      BuildingOffice2Icon,
    iconBg:    "bg-blue-500/10",
    iconColor: "text-blue-400",
    accent:    "from-blue-500/40 to-transparent",
    border:    "border-blue-500/20 hover:border-blue-500/40",
    glow:      "hover:shadow-blue-500/10",
  },
  {
    label:     "Catálogo Productos",
    key:       "Product",
    icon:      CubeIcon,
    iconBg:    "bg-purple-500/10",
    iconColor: "text-purple-400",
    accent:    "from-purple-500/40 to-transparent",
    border:    "border-purple-500/20 hover:border-purple-500/40",
    glow:      "hover:shadow-purple-500/10",
  },
  {
    label:     "Documentos EDI",
    key:       "Document",
    icon:      DocumentTextIcon,
    iconBg:    "bg-amber-500/10",
    iconColor: "text-amber-400",
    accent:    "from-amber-500/40 to-transparent",
    border:    "border-amber-500/20 hover:border-amber-500/40",
    glow:      "hover:shadow-amber-500/10",
  },
  {
    label:     "Total Conexiones",
    key:       "__total_edges__",
    icon:      ArrowsRightLeftIcon,
    iconBg:    "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    accent:    "from-emerald-500/40 to-transparent",
    border:    "border-emerald-500/20 hover:border-emerald-500/40",
    glow:      "hover:shadow-emerald-500/10",
  },
] as const;

const STAGGER = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"] as const;

interface KpiGridProps {
  values: Record<string, number>;
}

export default function KpiGrid({ values }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {KPI_CONFIG.map((kpi, i) => (
        <div
          key={kpi.label}
          className={`animate-fade-up ${STAGGER[i]} relative overflow-hidden bg-white/[0.04] rounded-2xl border ${kpi.border} p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg ${kpi.glow}`}
        >
          <div aria-hidden className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${kpi.accent}`} />
          <div className={`p-2.5 ${kpi.iconBg} rounded-xl shrink-0`}>
            <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-muted)] text-[0.65rem] uppercase font-semibold tracking-[0.1em] leading-tight truncate">
              {kpi.label}
            </p>
            <p className="text-[var(--text-primary)] text-2xl font-black mt-0.5 tabular-nums">
              {(values[kpi.key] ?? 0).toLocaleString("es")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}