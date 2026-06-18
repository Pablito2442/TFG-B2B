"use client";

import { useState, useReducer, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyEuroIcon,
  LinkIcon,
  CpuChipIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  analyticsReducer,
  INITIAL_ANALYTICS_STATE,
  useFetchTab,
} from "@/hooks/useFetchTab";
import { RiskTab }          from "@/components/analytics/RiskTab";
import { DiscrepanciesTab } from "@/components/analytics/DiscrepanciesTab";
import { LeadTimeTab }      from "@/components/analytics/LeadTimeTab";
import { ExposureTab }      from "@/components/analytics/ExposureTab";
import { TraceabilityTab }  from "@/components/analytics/TraceabilityTab";
import { GdsTab }           from "@/components/analytics/GdsTab";
import { ContractsTab }     from "@/components/analytics/ContractsTab";
import { SynthesisTab }     from "@/components/analytics/SynthesisTab";

/* ── Tab metadata ────────────────────────────────────── */
const TABS = [
  { index: 0, name: "Riesgo",        description: "Concentración de proveedores y scoring compuesto", icon: ShieldExclamationIcon },
  { index: 1, name: "Discrepancias", description: "Calidad documental y tasa de error por proveedor", icon: ExclamationTriangleIcon },
  { index: 2, name: "Lead Time",     description: "Cumplimiento de plazos de entrega por categoría",  icon: ClockIcon },
  { index: 3, name: "Exposición",    description: "Cartera vencida y exposición financiera activa",   icon: CurrencyEuroIcon },
  { index: 4, name: "Trazabilidad",  description: "Rutas documentales desde factura hasta pedido",   icon: LinkIcon },
  { index: 5, name: "GDS",           description: "Centralidad, comunidades y componentes conexos",  icon: CpuChipIcon },
  { index: 6, name: "Contratos",     description: "Perfil de contratos y distribución por tipo",     icon: DocumentTextIcon },
  { index: 7, name: "Síntesis",      description: "Cruce multidimensional de riesgo geográfico",     icon: SparklesIcon },
];

/* ── Inner content — reads search params ─────────────── */
function AnalyticsContent() {
  const searchParams = useSearchParams();
  const rawTab       = parseInt(searchParams.get("tab") ?? "0", 10);
  const activeTab    = isNaN(rawTab) || rawTab < 0 || rawTab > 7 ? 0 : rawTab;

  const [loadingTab, setLoadingTab] = useState<number | null>(null);
  const [state, dispatch] = useReducer(analyticsReducer, INITIAL_ANALYTICS_STATE);

  useFetchTab(activeTab, dispatch, setLoadingTab);

  const meta    = TABS[activeTab];
  const TabIcon = meta.icon;

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────── */}
      <header className="animate-fade-up pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.10em] uppercase text-gray-400 mb-2">
          <span>Analytics</span>
          <span>/</span>
          <span className="text-gray-500">{meta.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <TabIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 leading-none">{meta.name}</h1>
            <p className="text-xs text-gray-500 mt-1">{meta.description}</p>
          </div>
        </div>
      </header>

      {/* ── Tab content ──────────────────────────────── */}
      <div className="animate-fade-up stagger-1">
        {loadingTab === activeTab ? (
          <LoadingState text={`Cargando ${meta.name.toLowerCase()}...`} />
        ) : (
          <>
            {activeTab === 0 && <RiskTab risk={state.risk} scores={state.scores} fragility={state.fragility} />}
            {activeTab === 1 && <DiscrepanciesTab discrepancy={state.discrepancy} commercial={state.commercial} />}
            {activeTab === 2 && <LeadTimeTab leadTime={state.leadTime} />}
            {activeTab === 3 && <ExposureTab payment={state.payment} overdue={state.overdueRows} />}
            {activeTab === 4 && <TraceabilityTab exactPaths={state.exactPaths} forward={state.forward} lineage={state.lineage} />}
            {activeTab === 5 && <GdsTab gds={state.gds} />}
            {activeTab === 6 && <ContractsTab contracts={state.contracts} contractDetail={state.contractDetail} />}
            {activeTab === 7 && <SynthesisTab geographic={state.geographic} crossSuppliers={state.crossSuppliers} crossBuyers={state.crossBuyers} />}
          </>
        )}
      </div>

    </main>
  );
}

/* ── Page wrapper with Suspense for useSearchParams ───── */
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingState text="Cargando vista de analítica..." />}>
      <AnalyticsContent />
    </Suspense>
  );
}
