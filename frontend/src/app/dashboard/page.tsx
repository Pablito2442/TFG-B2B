"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SectionHeader    from "@/components/dashboard/SectionHeader";
import KpiGrid          from "@/components/dashboard/KpiGrid";
import HealthStrip      from "@/components/dashboard/HealthStrip";
import TemporalSection  from "@/components/dashboard/TemporalSection";
import ScaleFreeSection from "@/components/dashboard/ScaleFreeSection";
import RankingsGrid     from "@/components/dashboard/RankingsGrid";
import { MapPinIcon, CircleStackIcon } from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import type { DashboardResponse } from "@/types/dashboard";

const SpainMap = dynamic(() => import("@/components/charts/SpainMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03]">
      <div className="w-7 h-7 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      <span className="ml-3 text-[var(--text-muted)] text-sm">Cargando motor geográfico...</span>
    </div>
  ),
});

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user }              = useAuth();
  const [data, setData]       = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/dashboard/macro`)
      .then((r) => r.json())
      .then((json) => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState text="Sincronizando con el motor Neo4j..." />;
  if (!data?.macro_stats) {
    return (
      <ErrorState
        title="Sin conexión de datos"
        message="Asegúrate de haber ejecutado el pipeline primero o de que FastAPI esté encendido."
      />
    );
  }

  /* ── Data extraction ───────────────────────────────────────────────────── */

  const nodes         = data.macro_stats.node_counts         ?? {};
  const relationships = data.macro_stats.relationship_counts ?? {};

  const totalNodes    = Object.values(nodes).reduce((acc, v) => acc + v, 0);
  if (totalNodes === 0) {
    return <EmptyState isAdmin={user?.role === "admin"} />;
  }

  const totalRelaciones = Object.values(relationships).reduce((acc, v) => acc + v, 0);
  const kpiValues: Record<string, number> = { ...nodes, __total_edges__: totalRelaciones };

  const docTypeChartData = Object.entries(data.macro_stats.doc_type_counts ?? {}).map(
    ([name, value]) => ({ name, value })
  );

  const topSuppliers = (data.macro_stats.top_suppliers ?? []).map((s) => ({
    name: s.legal_name, value: s.supplies_out,
  }));
  const topBuyers = (data.macro_stats.top_buyers ?? []).map((b) => ({
    name: b.legal_name, value: b.supplies_in,
  }));

  const seriesTemporales = (data.temporal_series ?? []).map((row) => ({
    ...row,
    date: `${row.year}-${String(row.month).padStart(2, "0")}`,
  }));

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
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

      {/* ── NETWORK STRUCTURE KPIs ────────────────────────────────────────── */}
      <KpiGrid values={kpiValues} />

      {/* ── FINANCIAL + DOCUMENT HEALTH STRIP ────────────────────────────── */}
      <HealthStrip
        econVol={data.macro_stats.economic_volume ?? {
          invoice_count: 0, total_gross_eur: 0, total_tax_eur: 0, total_net_eur: 0,
        }}
        docHealth={data.macro_stats.document_health ?? {
          total_documents: 0, flagged_documents: 0, overall_discrepancy_rate_pct: 0,
        }}
      />

      {/* ── TEMPORAL CHART ────────────────────────────────────────────────── */}
      <TemporalSection data={seriesTemporales} />

      {/* ── DOC TYPE + TOP SUPPLIERS + TOP BUYERS ────────────────────────── */}
      <RankingsGrid
        docTypes={docTypeChartData}
        suppliers={topSuppliers}
        buyers={topBuyers}
      />

      {/* ── SCALE-FREE TOPOLOGY VALIDATION ───────────────────────────────── */}
      <ScaleFreeSection scaleFree={data.macro_stats.scale_free_metrics ?? {}} />

      {/* ── SPAIN MAP ─────────────────────────────────────────────────────── */}
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