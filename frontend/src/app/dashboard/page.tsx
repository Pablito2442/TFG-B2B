"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SectionHeader     from "@/components/dashboard/SectionHeader";
import SimpleBarList     from "@/components/dashboard/SimpleBarList";
import DocTypeDonut      from "@/components/dashboard/DocTypeDonut";
import TemporalAreaChart from "@/components/dashboard/TemporalAreaChart";
import {
  BuildingOffice2Icon,
  CubeIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  MapPinIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui/LoadingState";

const SpainMap = dynamic(() => import("@/components/charts/SpainMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
      <div className="w-7 h-7 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      <span className="ml-3 text-[var(--text-muted)] text-sm">Cargando motor geográfico...</span>
    </div>
  ),
});

const KPI_CONFIG = [
  {
    label:     "Empresas Activas",
    key:       "Company" as const,
    icon:      BuildingOffice2Icon,
    iconBg:    "bg-blue-500/10",
    iconColor: "text-blue-400",
    accent:    "from-blue-500/40 to-transparent",
    border:    "border-blue-500/20 hover:border-blue-500/40",
    glow:      "hover:shadow-blue-500/10",
  },
  {
    label:     "Catálogo Productos",
    key:       "Product" as const,
    icon:      CubeIcon,
    iconBg:    "bg-purple-500/10",
    iconColor: "text-purple-400",
    accent:    "from-purple-500/40 to-transparent",
    border:    "border-purple-500/20 hover:border-purple-500/40",
    glow:      "hover:shadow-purple-500/10",
  },
  {
    label:     "Documentos EDI",
    key:       "Document" as const,
    icon:      DocumentTextIcon,
    iconBg:    "bg-amber-500/10",
    iconColor: "text-amber-400",
    accent:    "from-amber-500/40 to-transparent",
    border:    "border-amber-500/20 hover:border-amber-500/40",
    glow:      "hover:shadow-amber-500/10",
  },
  {
    label:     "Total Conexiones",
    key:       "__total_edges__" as const,
    icon:      ArrowsRightLeftIcon,
    iconBg:    "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    accent:    "from-emerald-500/40 to-transparent",
    border:    "border-emerald-500/20 hover:border-emerald-500/40",
    glow:      "hover:shadow-emerald-500/10",
  },
];

const STAGGER = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"] as const;

/* ── Page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/macro`)
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading)       return <LoadingState text="Sincronizando con el motor Neo4j..." />;
  if (!data?.macro_stats) {
    return (
      <ErrorState
        title="Sin conexión de datos"
        message="Asegúrate de haber ejecutado el pipeline primero o de que FastAPI esté encendido."
      />
    );
  }

  /* data prep */
  const nodes        = data.macro_stats.node_counts        || {};
  const relationships = data.macro_stats.relationship_counts || {};
  const totalRelaciones = Object.values(relationships).reduce(
    (acc: number, v: unknown) => acc + (v as number), 0
  );
  const kpiValues: Record<string, number> = { ...nodes, __total_edges__: totalRelaciones };

  const docTypeCounts: Record<string, number> = data.macro_stats.doc_type_counts || {};
  const docTypeChartData = Object.entries(docTypeCounts).map(([name, value]) => ({
    name, value: value as number,
  }));

  const topSuppliers = (data.macro_stats.top_suppliers || []).map((s: any) => ({
    name: s.legal_name, value: s.supplies_out,
  }));
  const topBuyers = (data.macro_stats.top_buyers || []).map((b: any) => ({
    name: b.legal_name, value: b.supplies_in,
  }));

  const seriesTemporales = (data.temporal_series || []).map((row: any) => ({
    ...row,
    date: row.year && row.month
      ? `${row.year}-${String(row.month).padStart(2, "0")}`
      : row.date,
  }));

  /* derived temporal stats */
  const totalDocs = seriesTemporales.reduce((s: number, r: any) => s + (r.documents ?? 0), 0);
  const peakRow   = seriesTemporales.reduce(
    (max: any, r: any) => (r.documents ?? 0) > (max?.documents ?? 0) ? r : max,
    seriesTemporales[0] ?? null
  );
  const firstDate = seriesTemporales[0]?.date ?? "—";
  const lastDate  = seriesTemporales[seriesTemporales.length - 1]?.date ?? "—";
  const spanLabel = firstDate !== "—" ? `${firstDate} → ${lastDate}` : "—";

  const TEMPORAL_STATS = [
    {
      icon:    HashtagIcon,
      label:   "Total documentos",
      value:   totalDocs > 0 ? totalDocs.toLocaleString("es") : "—",
      sub:     "en toda la serie",
      iconBg:  "bg-[var(--primary-dim)]",
      color:   "text-[var(--primary)]",
    },
    {
      icon:    ArrowTrendingUpIcon,
      label:   "Mes pico",
      value:   peakRow ? (peakRow.documents ?? 0).toLocaleString("es") : "—",
      sub:     peakRow?.date ?? "—",
      iconBg:  "bg-violet-500/10",
      color:   "text-violet-400",
    },
    {
      icon:    CalendarDaysIcon,
      label:   "Período activo",
      value:   seriesTemporales.length > 0 ? `${seriesTemporales.length} meses` : "—",
      sub:     spanLabel,
      iconBg:  "bg-blue-500/10",
      color:   "text-blue-400",
    },
  ];

  /* render */
  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

      {/* PAGE HEADER */}
      <div className="animate-fade-up space-y-1.5 pb-2 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 text-[var(--primary)] text-sm font-medium">
          <CircleStackIcon className="w-4 h-4" aria-hidden />
          Dashboard · Neo4j
        </div>
        <h1 className="text-[1.75rem] md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Dashboard Macroscópico
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Visión global de la red logística en base de datos de grafos.
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {KPI_CONFIG.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`animate-fade-up ${STAGGER[i]} relative overflow-hidden bg-white/[0.04] rounded-2xl border ${kpi.border} p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:shadow-lg ${kpi.glow}`}
          >
            {/* coloured top-edge accent */}
            <div
              aria-hidden
              className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${kpi.accent}`}
            />
            <div className={`p-2.5 ${kpi.iconBg} rounded-xl shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[var(--text-muted)] text-[0.65rem] uppercase font-semibold tracking-[0.1em] leading-tight truncate">
                {kpi.label}
              </p>
              <p className="text-[var(--text-primary)] text-2xl md:text-3xl font-black mt-0.5 tabular-nums">
                {(kpiValues[kpi.key] ?? 0).toLocaleString("es")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* TEMPORAL CHART */}
      <div className="animate-fade-up stagger-1 relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-[oklch(0.60_0.128_158/0.28)] rounded-2xl shadow-lg shadow-[oklch(0.60_0.128_158/0.10)]">
        {/* background glow behind chart fill */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[oklch(0.60_0.128_158/0.12)] blur-[80px] rounded-full"
        />
        {/* top accent line */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.60_0.128_158/0.60)] to-transparent"
        />

        {/* ── Header ─────────────────────────────────── */}
        <div className="px-6 pt-6 pb-2">
          <SectionHeader
            icon={ChartBarIcon}
            title="Evolución de Transacciones Documentales"
            subtitle="Línea temporal de la generación de contratos y facturas en el sistema."
          />
        </div>

        {seriesTemporales.length > 0 ? (
          <>
            {/* ── Derived-stat cards ──────────────────────── */}
            <div className="grid grid-cols-3 gap-3 px-6 mb-6">
              {TEMPORAL_STATS.map((s) => (
                <div
                  key={s.label}
                  className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`p-1 ${s.iconBg} rounded`}>
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} aria-hidden />
                    </div>
                    <span className="text-[var(--text-secondary)] text-[11px] font-semibold">
                      {s.label}
                    </span>
                  </div>
                  <p className={`text-xl font-black tabular-nums tracking-tight ${s.color}`}>
                    {s.value}
                  </p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-0.5 font-mono truncate">
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Chart ───────────────────────────────── */}
            <div className="px-6 pb-6">
              <TemporalAreaChart data={seriesTemporales} />
            </div>
          </>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center px-6 pb-6 text-center">
            <ChartBarIcon className="w-8 h-8 text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-medium">Sin datos temporales</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">
              Ejecuta el pipeline para visualizar el flujo de documentos.
            </p>
          </div>
        )}
      </div>

      {/* DOC TYPE + TOP SUPPLIERS + TOP BUYERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Donut */}
        <div className="animate-fade-up stagger-2 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6">
          <SectionHeader
            icon={DocumentDuplicateIcon}
            title="Tipos de Documento"
            subtitle="Distribución por categoría EDI."
            iconColor="text-[var(--accent)]"
            iconBg="bg-[var(--accent-dim)]"
          />
          {docTypeChartData.length > 0 ? (
            <DocTypeDonut data={docTypeChartData} />
          ) : (
            <p className="text-[var(--text-muted)] text-sm py-10 text-center">
              Sin datos — ejecuta el pipeline primero.
            </p>
          )}
        </div>

        {/* Top Suppliers */}
        <div className="animate-fade-up stagger-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6">
          <SectionHeader
            icon={BuildingOffice2Icon}
            title="Top Proveedores"
            subtitle="Por número de clientes abastecidos."
          />
          {topSuppliers.length > 0 ? (
            <SimpleBarList data={topSuppliers} suffix="clientes" color="primary" />
          ) : (
            <p className="text-[var(--text-muted)] text-sm py-10 text-center">Sin datos.</p>
          )}
        </div>

        {/* Top Buyers */}
        <div className="animate-fade-up stagger-4 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6">
          <SectionHeader
            icon={BuildingOffice2Icon}
            title="Top Compradores"
            subtitle="Por número de proveedores recibidos."
            iconColor="text-violet-400"
            iconBg="bg-violet-500/10"
          />
          {topBuyers.length > 0 ? (
            <SimpleBarList data={topBuyers} suffix="proveedores" color="violet" />
          ) : (
            <p className="text-[var(--text-muted)] text-sm py-10 text-center">Sin datos.</p>
          )}
        </div>

      </div>

      {/* SPAIN MAP */}
      <div className="animate-fade-up bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 md:p-8">
        <SectionHeader
          icon={MapPinIcon}
          title="Distribución Geográfica"
          subtitle="Concentración de empresas por municipio español."
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <SpainMap />
      </div>

    </main>
  );
}
