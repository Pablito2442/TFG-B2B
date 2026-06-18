"use client";

import { useState, useMemo } from "react";
import BarChart   from "@/components/charts/BarChart";
import RadarChart from "@/components/charts/RadarChart";
import type { GeographicRiskRow, CrossSupplierRow, CrossBuyerRow } from "@/types/analytics";
import { EMPTY, SectionLabel, ShowMoreButton, SectionModal } from "@/components/analytics/shared";
import { PAGE_SIZE as PAGE } from "@/lib/analytics";
import { GeographicTable } from "./GeographicTable";
import { SuppliersTable }  from "./SuppliersTable";
import { BuyersTable }     from "./BuyersTable";

const RADAR_COLORS = ["#ef4444","#f97316","#f59e0b","#8b5cf6","#6366f1","#14b8a6"];

interface Props {
  geographic:     GeographicRiskRow[];
  crossSuppliers: CrossSupplierRow[];
  crossBuyers:    CrossBuyerRow[];
}

export function SynthesisTab({ geographic, crossSuppliers, crossBuyers }: Props) {
  const [showGeo,       setShowGeo]       = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showBuyers,    setShowBuyers]    = useState(false);

  const hasGeo       = geographic.length > 0;
  const hasSuppliers = crossSuppliers.length > 0;
  const hasBuyers    = crossBuyers.length > 0;
  const hasAny       = hasGeo || hasSuppliers || hasBuyers;

  // Stable section indices — only count visible sections
  const sectionIdx = useMemo(() => {
    const visible = [
      { key: "geo",       show: hasGeo       },
      { key: "suppliers", show: hasSuppliers },
      { key: "buyers",    show: hasBuyers    },
    ];
    let n = 1;
    const map: Record<string, string> = {};
    for (const s of visible) {
      if (s.show) map[s.key] = `${String(n++).padStart(2, "0")} /`;
    }
    return map;
  }, [hasGeo, hasSuppliers, hasBuyers]);

  if (!hasAny) return EMPTY;

  // ── Geographic KPIs ──────────────────────────────────────────
  const geoSorted     = [...geographic].sort((a, b) => b.discrepancy_pct - a.discrepancy_pct);
  const avgReliability = geographic.length > 0
    ? (geographic.reduce((s, r) => s + r.avg_reliability, 0) / geographic.length * 100).toFixed(1)
    : "—";

  // ── Suppliers KPIs ───────────────────────────────────────────
  const dualRiskCount = crossSuppliers.filter((r) => r.risk_score >= 40 && r.overdue_count > 0).length;
  const avgRiskScore  = crossSuppliers.length > 0
    ? (crossSuppliers.reduce((s, r) => s + r.risk_score, 0) / crossSuppliers.length).toFixed(1)
    : "—";

  // ── Buyers KPIs ──────────────────────────────────────────────
  const dualExposureCount = crossBuyers.filter((r) => r.top_supplier_pct >= 50 && r.overdue_received > 0).length;
  const avgDependency     = crossBuyers.length > 0
    ? (crossBuyers.reduce((s, r) => s + r.top_supplier_pct, 0) / crossBuyers.length).toFixed(1)
    : "—";

  // ── Radar data ────────────────────────────────────────────────
  const top6      = crossSuppliers.slice(0, 6);
  const maxRisk   = Math.max(...crossSuppliers.map((r) => r.risk_score), 1);
  const maxDisc   = Math.max(...crossSuppliers.map((r) => r.discrepancy_pct), 1);
  const maxOver   = Math.max(...crossSuppliers.map((r) => r.overdue_count), 1);
  const maxDeg    = Math.max(...crossSuppliers.map((r) => r.supply_degree), 1);
  const radarKeys = top6.map((r, i, arr) => {
    const word = r.supplier.split(" ")[0];
    return arr.slice(0, i).some((p) => p.supplier.split(" ")[0] === word) ? `${word}${i}` : word;
  });

  return (
    <div className="space-y-10">

      {/* ── DISTRIBUCIÓN GEOGRÁFICA DEL RIESGO ──────────────────── */}
      {hasGeo && (
        <section>
          <SectionLabel
            index={sectionIdx["geo"]}
            title="Distribución Geográfica del Riesgo"
            subtitle="Tasa de discrepancia y fiabilidad media de proveedores por Comunidad Autónoma."
          />

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
            {[
              { label: "Regiones analizadas",    value: geographic.length.toString() },
              { label: "Mayor discrepancia",      value: `${geoSorted[0]?.discrepancy_pct ?? "—"}% · ${geoSorted[0]?.region ?? ""}` },
              { label: "Fiabilidad media global", value: `${avgReliability}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white px-4 py-4 text-center">
                <p className="text-gray-900 font-mono font-bold tabular-nums text-lg truncate">{kpi.value}</p>
                <p className="text-gray-400 text-xs mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <BarChart
                data={geoSorted.filter((r) => r.discrepancy_pct > 0)}
                index="region"
                category="discrepancy_pct"
                layout="vertical"
                yAxisWidth={180}
                rowHeight={26}
                valueFormatter={(n) => `${n}%`}
                colorFn={(v) => v >= 20 ? "#ef4444" : v >= 10 ? "#f59e0b" : "#6366f1"}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <GeographicTable rows={geographic.slice(0, PAGE)} />
              {geographic.length > PAGE && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                  <ShowMoreButton total={geographic.length} onClick={() => setShowGeo(true)} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── PROVEEDORES EN MÚLTIPLES DIMENSIONES DE RIESGO ──────── */}
      {hasSuppliers && (
        <section>
          <SectionLabel
            index={sectionIdx["suppliers"]}
            title="Proveedores en Múltiples Dimensiones de Riesgo"
            subtitle="Score compuesto (fiabilidad 40% + discrepancia 35% + retraso 25%) cruzado con exposición por facturas vencidas."
          />

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
            {[
              { label: "Proveedores analizados", value: crossSuppliers.length.toString() },
              { label: "Riesgo dual (score + vencidas)", value: dualRiskCount.toString() },
              { label: "Score de riesgo medio",  value: avgRiskScore },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white px-4 py-4 text-center">
                <p className="text-gray-900 font-mono font-bold tabular-nums text-lg">{kpi.value}</p>
                <p className="text-gray-400 text-xs mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {crossSuppliers.length >= 2 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
              <p className="text-gray-700 font-semibold text-sm mb-1">Perfil de riesgo multidimensional</p>
              <p className="text-gray-400 text-xs mb-4">
                Top 6 proveedores — valores normalizados 0–100 por eje. Mayor área = mayor riesgo acumulado.
              </p>
              <RadarChart
                axes={["Score Riesgo", "Discrepancia", "Fact. Vencidas", "Grado Suministro"]}
                series={top6.map((r, i) => ({
                  name:   radarKeys[i],
                  color:  RADAR_COLORS[i % RADAR_COLORS.length],
                  values: [
                    (r.risk_score      / maxRisk) * 100,
                    (r.discrepancy_pct / maxDisc) * 100,
                    (r.overdue_count   / maxOver) * 100,
                    (r.supply_degree   / maxDeg)  * 100,
                  ],
                }))}
              />
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <SuppliersTable rows={crossSuppliers.slice(0, PAGE)} />
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              {crossSuppliers.length > PAGE ? (
                <ShowMoreButton total={crossSuppliers.length} onClick={() => setShowSuppliers(true)} />
              ) : (
                <p className="text-gray-400 text-xs">
                  ⚠ Filas marcadas: score ≥ 40 y facturas vencidas activas — riesgo acumulado en dos dimensiones.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── COMPRADORES CON DOBLE EXPOSICIÓN ────────────────────── */}
      {hasBuyers && (
        <section>
          <SectionLabel
            index={sectionIdx["buyers"]}
            title="Compradores con Doble Exposición"
            subtitle="Alta dependencia de un único proveedor combinada con facturas vencidas recibidas — vulnerabilidad estructural y financiera simultánea."
          />

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
            {[
              { label: "Compradores analizados",         value: crossBuyers.length.toString() },
              { label: "Con doble exposición (dep + vencidas)", value: dualExposureCount.toString() },
              { label: "Dependencia media",              value: `${avgDependency}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white px-4 py-4 text-center">
                <p className="text-gray-900 font-mono font-bold tabular-nums text-lg">{kpi.value}</p>
                <p className="text-gray-400 text-xs mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <BuyersTable rows={crossBuyers.slice(0, PAGE)} />
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              {crossBuyers.length > PAGE ? (
                <ShowMoreButton total={crossBuyers.length} onClick={() => setShowBuyers(true)} />
              ) : (
                <p className="text-gray-400 text-xs">
                  ⚠ Filas marcadas: dependencia ≥ 50% y facturas vencidas activas — doble exposición estructural y financiera.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── MODALS ───────────────────────────────────────────────── */}
      <SectionModal
        title="Distribución Geográfica del Riesgo — ranking completo"
        open={showGeo}
        onClose={() => setShowGeo(false)}
      >
        <GeographicTable rows={geoSorted} />
      </SectionModal>

      <SectionModal
        title="Proveedores en Múltiples Dimensiones de Riesgo — ranking completo"
        open={showSuppliers}
        onClose={() => setShowSuppliers(false)}
      >
        <>
          <SuppliersTable rows={crossSuppliers} />
          <p className="text-gray-400 text-xs px-4 py-3 border-t border-gray-100">
            ⚠ Filas marcadas: score ≥ 40 y facturas vencidas activas.
          </p>
        </>
      </SectionModal>

      <SectionModal
        title="Compradores con Doble Exposición — ranking completo"
        open={showBuyers}
        onClose={() => setShowBuyers(false)}
      >
        <>
          <BuyersTable rows={crossBuyers} />
          <p className="text-gray-400 text-xs px-4 py-3 border-t border-gray-100">
            ⚠ Filas marcadas: dependencia ≥ 50% y facturas vencidas activas.
          </p>
        </>
      </SectionModal>

    </div>
  );
}