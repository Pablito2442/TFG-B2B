"use client";

import { useState, useEffect, useRef } from "react";
import {
  Tab, TabGroup, TabList, TabPanel, TabPanels,
} from "@tremor/react";
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  CurrencyEuroIcon,
  LinkIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import type {
  RiskData, DiscrepancyRow, LeadTimeRow, PaymentRow,
  LineageRow, GdsData, ExactPathRow, ForwardRow, CommercialImpactRow,
} from "@/types/analytics";
import { RiskTab }          from "@/components/analytics/RiskTab";
import { DiscrepanciesTab } from "@/components/analytics/DiscrepanciesTab";
import { LeadTimeTab }      from "@/components/analytics/LeadTimeTab";
import { ExposureTab }      from "@/components/analytics/ExposureTab";
import { TraceabilityTab }  from "@/components/analytics/TraceabilityTab";
import { GdsTab }           from "@/components/analytics/GdsTab";

const TAB_LABELS = [
  "Cargando análisis de riesgo…",
  "Cargando discrepancias…",
  "Cargando lead time…",
  "Cargando exposición financiera…",
  "Cargando trazabilidad…",
  "Cargando GDS…",
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab]     = useState(0);
  const [loadingTab, setLoadingTab]   = useState<number | null>(null);
  const fetchedRef                    = useRef<Set<number>>(new Set());

  const [risk, setRisk]               = useState<RiskData | null>(null);
  const [commercial, setCommercial]   = useState<CommercialImpactRow[]>([]);
  const [discrepancy, setDiscrepancy] = useState<DiscrepancyRow[]>([]);
  const [leadTime, setLeadTime]       = useState<LeadTimeRow[]>([]);
  const [payment, setPayment]         = useState<PaymentRow[]>([]);
  const [lineage, setLineage]         = useState<LineageRow[]>([]);
  const [gds, setGds]                 = useState<GdsData>({ bottlenecks: [], communities: [] });
  const [exactPaths, setExactPaths]   = useState<ExactPathRow[]>([]);
  const [forward, setForward]         = useState<ForwardRow[]>([]);

  const fetchForTab = async (tab: number) => {
    if (fetchedRef.current.has(tab)) return;
    fetchedRef.current.add(tab);
    setLoadingTab(tab);

    try {
      switch (tab) {
        case 0: {
          const [riskD, comD] = await Promise.all([
            fetch(`${API_BASE}/api/analytics/risk`).then((r) => r.json()),
            fetch(`${API_BASE}/api/analytics/lineage/commercial-impact`).then((r) => r.json()),
          ]);
          setRisk(riskD?.total_supplies_edges ? riskD : null);
          setCommercial(Array.isArray(comD) ? comD : []);
          break;
        }
        case 1: {
          const discD = await fetch(`${API_BASE}/api/analytics/discrepancy-suppliers`).then((r) => r.json());
          setDiscrepancy(Array.isArray(discD) ? discD : []);
          break;
        }
        case 2: {
          const ltD = await fetch(`${API_BASE}/api/analytics/lead-time`).then((r) => r.json());
          setLeadTime(Array.isArray(ltD) ? ltD : []);
          break;
        }
        case 3: {
          const payD = await fetch(`${API_BASE}/api/analytics/payment`).then((r) => r.json());
          setPayment(Array.isArray(payD) ? payD : []);
          break;
        }
        case 4: {
          const [linD, pathD, fwdD] = await Promise.all([
            fetch(`${API_BASE}/api/analytics/lineage/backward`).then((r) => r.json()),
            fetch(`${API_BASE}/api/analytics/lineage/exact-paths`).then((r) => r.json()),
            fetch(`${API_BASE}/api/analytics/lineage/forward`).then((r) => r.json()),
          ]);
          setLineage(Array.isArray(linD) ? linD : []);
          setExactPaths(Array.isArray(pathD) ? pathD : []);
          setForward(Array.isArray(fwdD) ? fwdD : []);
          break;
        }
        case 5: {
          const gdsD = await fetch(`${API_BASE}/api/analytics/gds`).then((r) => r.json());
          setGds(gdsD || { bottlenecks: [], communities: [] });
          break;
        }
      }
    } catch (err) {
      console.error(`Tab ${tab} fetch failed:`, err);
    } finally {
      setLoadingTab(null);
    }
  };

  // Load the first tab on mount
  useEffect(() => { fetchForTab(0); }, []);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    fetchForTab(index);
  };

  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white">Analítica Avanzada de Red</h1>
        <p className="text-slate-400 mt-1">
          Riesgo de concentración, calidad documental, cumplimiento operativo y exposición financiera.
        </p>
      </div>

      <TabGroup index={activeTab} onIndexChange={handleTabChange}>
        <TabList className="border-b border-slate-800 mb-6">
          <Tab icon={ShieldExclamationIcon}>Riesgo</Tab>
          <Tab icon={ExclamationTriangleIcon}>Discrepancias</Tab>
          <Tab icon={ClockIcon}>Lead Time</Tab>
          <Tab icon={CurrencyEuroIcon}>Exposición</Tab>
          <Tab icon={LinkIcon}>Trazabilidad</Tab>
          <Tab icon={CpuChipIcon}>GDS</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {loadingTab === 0
              ? <LoadingState text={TAB_LABELS[0]} />
              : <RiskTab risk={risk} commercial={commercial} />}
          </TabPanel>
          <TabPanel>
            {loadingTab === 1
              ? <LoadingState text={TAB_LABELS[1]} />
              : <DiscrepanciesTab discrepancy={discrepancy} />}
          </TabPanel>
          <TabPanel>
            {loadingTab === 2
              ? <LoadingState text={TAB_LABELS[2]} />
              : <LeadTimeTab leadTime={leadTime} />}
          </TabPanel>
          <TabPanel>
            {loadingTab === 3
              ? <LoadingState text={TAB_LABELS[3]} />
              : <ExposureTab payment={payment} />}
          </TabPanel>
          <TabPanel>
            {loadingTab === 4
              ? <LoadingState text={TAB_LABELS[4]} />
              : <TraceabilityTab exactPaths={exactPaths} forward={forward} lineage={lineage} />}
          </TabPanel>
          <TabPanel>
            {loadingTab === 5
              ? <LoadingState text={TAB_LABELS[5]} />
              : <GdsTab gds={gds} />}
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}
