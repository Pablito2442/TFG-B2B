"use client";

import {
  BuildingOffice2Icon,
  CubeIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import type { MacroStats } from "@/types/dashboard";
import StatCard from "@/components/ui/StatCard";

/* ── KpiGrid ──────────────────────────────────────────────── */

const KPI_CONFIG = [
  { label: "Empresas Activas",   key: "Company",         icon: BuildingOffice2Icon },
  { label: "Catálogo Productos", key: "Product",         icon: CubeIcon            },
  { label: "Documentos EDI",     key: "Document",        icon: DocumentTextIcon    },
  { label: "Total Conexiones",   key: "__total_edges__", icon: ArrowsRightLeftIcon },
] as const;

type KpiKey = typeof KPI_CONFIG[number]["key"];

interface KpiGridProps {
  values:  Partial<Record<KpiKey, number>>;
  trends?: Partial<Record<KpiKey, number>>;
}

export default function KpiGrid({ values, trends }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {KPI_CONFIG.map((kpi, i) => {
        const trend = trends?.[kpi.key] ?? null;
        
        return (
          <div
            key={kpi.label}
            className="animate-fade-up bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
              <span className="text-xs text-gray-500 font-medium truncate flex-1">
                {kpi.label}
              </span>
              
              {trend !== null && (
                <span 
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                    trend >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                  }`}
                >
                  {trend > 0 ? "+" : ""}{trend.toFixed(2)}%
                </span>
              )}
            </div>
            
            <p className="text-3xl font-black text-gray-900 tabular-nums leading-none mt-4">
              {(values[kpi.key] ?? 0).toLocaleString("es")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── HealthStrip ──────────────────────────────────────────── */

type HealthStripProps = {
  econVol:   MacroStats["economic_volume"];
  docHealth: MacroStats["document_health"];
  sparkVol?: number[];
  sparkDisc?: number[];
  sparkRate?: number[];
};

const formatEUR = (n: number) =>
  Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);

const HEALTH_CONFIG: {
  icon:        React.ElementType;
  label:       string;
  getValue:    (p: HealthStripProps) => string;
  getSub:      (p: HealthStripProps) => string;
  getSpark:    (p: HealthStripProps) => number[] | undefined;
  sparkId:     string;
  formatHover: (v: number) => string;
  invertTrend: boolean;
}[] = [
  {
    icon:        BanknotesIcon,
    label:       "Volumen Bruto Total",
    getValue:    (p) => p.econVol.total_gross_eur != null ? formatEUR(p.econVol.total_gross_eur) : "—",
    getSub:      (p) => p.econVol.invoice_count != null ? `${p.econVol.invoice_count.toLocaleString("es")} facturas emitidas` : "",
    getSpark:    (p) => p.sparkVol,
    sparkId:     "spark-health-vol",
    formatHover: formatEUR,
    invertTrend: false,
  },
  {
    icon:        ExclamationTriangleIcon,
    label:       "Docs con Discrepancia",
    getValue:    (p) => p.docHealth.flagged_documents?.toLocaleString("es") ?? "0",
    getSub:      (p) => `de ${p.docHealth.total_documents?.toLocaleString("es") ?? "0"} documentos totales`,
    getSpark:    (p) => p.sparkDisc,
    sparkId:     "spark-health-disc",
    formatHover: (v) => `${Math.round(v).toLocaleString("es")} docs`,
    invertTrend: true,
  },
  {
    icon:        SignalIcon,
    label:       "Tasa Global Discrepancia",
    getValue:    (p) => `${p.docHealth.overall_discrepancy_rate_pct ?? 0}%`,
    getSub:      () => "sobre el total de documentos",
    getSpark:    (p) => p.sparkRate,
    sparkId:     "spark-health-rate",
    formatHover: (v) => `${v.toFixed(2)}%`,
    invertTrend: true,
  },
];

export function HealthStrip(props: HealthStripProps) {
  return (
    <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
      {HEALTH_CONFIG.map((cfg) => (
        <StatCard
          key={cfg.sparkId}
          icon={<cfg.icon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />}
          label={cfg.label}
          value={cfg.getValue(props)}
          sub={cfg.getSub(props)}
          sparkData={cfg.getSpark(props)}
          sparkId={cfg.sparkId}
          formatHover={cfg.formatHover}
          invertTrend={cfg.invertTrend}
        />
      ))}
    </div>
  );
}