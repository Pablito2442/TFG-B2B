"use client";

import { useState, useMemo } from "react";
import BarList from "@/components/charts/BarList";
import BubbleChart from "@/components/charts/BubbleChart";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import RingChart from "@/components/charts/RingChart";
import type { RiskData, SupplierScoreRow, BuyerFragilityRow } from "@/types/analytics";
import { EMPTY, ShowMoreButton, SectionModal, SectionLabel, InfoTooltip } from "@/components/analytics/shared";
import { PAGE_SIZE as PAGE } from "@/lib/analytics";
import { ScoresTable } from "./ScoresTable";
import { FragilityTable } from "./FragilityTable";

function fragilityTextColor(pct: number): string {
  if (pct >= 80) return "text-red-600";
  if (pct >= 50) return "text-amber-600";
  return "text-emerald-600";
}

interface Props {
  risk:      RiskData | null;
  scores:    SupplierScoreRow[];
  fragility: BuyerFragilityRow[];
}

const TOP_N_OPTIONS = [10, 20, 25] as const;

export function RiskTab({ risk, scores, fragility }: Props) {
  const [showScoresAll,    setShowScoresAll]    = useState(false);
  const [showFragilityAll, setShowFragilityAll] = useState(false);
  const [selectedTopN,     setSelectedTopN]     = useState<number>(10);
  const [showBarModal,     setShowBarModal]     = useState(false);

  function handleTopNChange(n: number) {
    setSelectedTopN(n);
    setShowBarModal(false);
  }

  const available   = risk?.top_suppliers ?? [];
  const sliced      = available.slice(0, selectedTopN);
  const computedPct = parseFloat(sliced.reduce((s, r) => s + r.share_pct, 0).toFixed(1));
  const restPct     = Math.max(0, 100 - computedPct);

  // Tertile-based risk groups: sort descending, split into 3 equal thirds
  const riskGroups = useMemo(() => {
    if (scores.length === 0) return { alto: [], medio: [], bajo: [], altoFloor: 0, medioFloor: 0 };
    const sorted   = [...scores].sort((a, b) => b.risk_score - a.risk_score);
    const n        = sorted.length;
    const altoEnd  = Math.max(1, Math.ceil(n / 3));
    const medioEnd = Math.max(altoEnd, Math.ceil((2 * n) / 3));
    return {
      alto:       sorted.slice(0, altoEnd),
      medio:      sorted.slice(altoEnd, medioEnd),
      bajo:       sorted.slice(medioEnd),
      altoFloor:  sorted[altoEnd  - 1]?.risk_score ?? 0,
      medioFloor: sorted[medioEnd - 1]?.risk_score ?? 0,
    };
  }, [scores]);

  const toPoint = (r: SupplierScoreRow) => ({
    x: r.discrepancy_pct,
    y: r.late_pct,
    z: Math.max((1 - r.avg_reliability) * 100, 2),
    label: r.supplier,
    meta: {
      "Discrepancia":    r.discrepancy_pct,
      "Entrega tardía":  r.late_pct,
      "Fiabilidad":      r.avg_reliability * 100,
      "Score de riesgo": r.risk_score,
    },
  });

  // Reference lines at the 33rd / 67th percentile of each axis independently,
  // so they always sit inside the visible domain and reflect the real distribution.
  const axisRefLines = useMemo(() => {
    if (scores.length < 3) return [];
    const byX  = [...scores].sort((a, b) => a.discrepancy_pct - b.discrepancy_pct);
    const p33X = byX[Math.floor(byX.length * 0.33)].discrepancy_pct;
    const p67X = byX[Math.floor(byX.length * 0.67)].discrepancy_pct;
    const byY  = [...scores].sort((a, b) => a.late_pct - b.late_pct);
    const p33Y = byY[Math.floor(byY.length * 0.33)].late_pct;
    const p67Y = byY[Math.floor(byY.length * 0.67)].late_pct;
    return [
      { axis: "x" as const, value: p33X, color: "#f59e0b", label: `${p33X.toFixed(1)}%` },
      { axis: "x" as const, value: p67X, color: "#ef4444", label: `${p67X.toFixed(1)}%` },
      { axis: "y" as const, value: p33Y, color: "#f59e0b", label: `${p33Y.toFixed(1)}%` },
      { axis: "y" as const, value: p67Y, color: "#ef4444", label: `${p67Y.toFixed(1)}%` },
    ];
  }, [scores]);

  return (
    <div className="space-y-10">

      {/* ── 01 · CONCENTRACIÓN DE RIESGO ────────────────────────── */}
      <section>
        <SectionLabel
          index="01 /"
          title="Concentración de Suministros"
          subtitle={`¿Qué porcentaje de la red de suministro controlan los ${selectedTopN} proveedores con mayor cuota? Una concentración elevada implica dependencia estructural y mayor exposición ante fallos puntuales.`}
        />
        {!risk ? EMPTY : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Donut + KPI combined */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldExclamationIcon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                    <div>
                      <p className="text-gray-900 font-semibold text-sm leading-tight">Cuota acumulada de la red</p>
                      <p className="text-gray-400 text-xs mt-0.5">Top-{selectedTopN} proveedores vs. resto de la red</p>
                    </div>
                  </div>
                  {/* Top-N selector pills */}
                  <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200 rounded-lg shrink-0">
                    {TOP_N_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => handleTopNChange(n)}
                        disabled={n > available.length}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
                          selectedTopN === n
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        Top {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Donut body */}
              <div className="px-5 py-4 flex-1 flex items-center justify-center">
                <RingChart
                  data={[
                    { name: `Top-${selectedTopN} proveedores`, value: computedPct, color: "#ef4444" },
                    { name: "Resto de la red",                  value: restPct,     color: "#e5e7eb" },
                  ]}
                  centerLabel={`${computedPct}%`}
                  centerSub={`top-${selectedTopN}`}
                  centerLabelClass="text-2xl font-black"
                  formatHoverValue={(value) => `${value.toFixed(1)}%`}
                  height={260}
                />
              </div>

              {/* Footer stats */}
              <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
                {[
                  { label: "Relaciones de suministro", value: risk.total_supplies_edges.toLocaleString("es") },
                  { label: "Proveedores analizados",   value: String(selectedTopN) },
                  { label: "Cuota media por proveedor", value: `${(computedPct / selectedTopN).toFixed(1)}%` },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 px-4 py-4 text-center">
                    <p className="text-gray-900 font-mono font-bold text-1xl tabular-nums">{s.value}</p>
                    <p className="text-gray-400 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar list */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <p className="text-gray-700 font-semibold text-sm mb-3">% de la red controlado por cada proveedor - top {selectedTopN}</p>
              <BarList
                data={sliced.slice(0, 10).map((s) => ({ name: s.name, value: s.share_pct }))}
                color="red"
                valueFormatter={(n) => `${n.toFixed(2)}%`}
              />
              {sliced.length > 10 && (
                <ShowMoreButton total={sliced.length} onClick={() => setShowBarModal(true)} />
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 02 · ÍNDICE DE RIESGO DE PROVEEDOR ──────────────────── */}
      {scores.length > 0 && (
        <section>
          <SectionLabel
            index="02 /"
            title="Matriz de Riesgo Operativo"
            subtitle="Análisis integral del riesgo de cada proveedor basado en su discrepancia histórica y porcentaje de entregas tardías. Identifica qué proveedores representan un riesgo operativo elevado para la empresa."
          />

          {/* Scatter/bubble overview */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-gray-700 font-semibold text-sm">Posicionamiento de riesgo por proveedor</p>
              <InfoTooltip direction="down" content={
                <div className="space-y-2">
                  <p className="font-semibold text-white mb-1">Umbrales de Referencia</p>
                  <p className="text-gray-400 text-[10px] leading-relaxed mb-2">
                    Calculados dinámicamente sobre el <strong>percentil 33 y 67</strong> de la distribución real de la red para segmentar matemáticamente a los proveedores en tres niveles de riesgo.
                  </p>
                  {axisRefLines.map((rl) => (
                    <div key={`${rl.axis}-${rl.value}`} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 border-t-2 border-dashed" style={{ borderColor: rl.color }} />
                      <span className="text-gray-300 text-[11px]">
                        {rl.axis === "x"
                          ? rl.color === "#f59e0b"
                            ? `Discrepancias (p33) — Inicio de riesgo medio (${rl.label})`
                            : `Discrepancias (p67) — Alerta de alto riesgo (${rl.label})`
                          : rl.color === "#f59e0b"
                            ? `Entregas tardías (p33) — Inicio de riesgo medio (${rl.label})`
                            : `Entregas tardías (p67) — Alerta de alto riesgo (${rl.label})`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              } />
            </div>
            <p className="text-gray-400 text-xs mb-4">
              Eje X = discrepancia (55 %) · Eje Y = entregas tardías (45 %) · Tamaño = fiabilidad inversa (inf.) · Color = grupo de riesgo
            </p>
            <BubbleChart
              series={[
                {
                  name: `Bajo riesgo (<${riskGroups.medioFloor.toFixed(1)})`,
                  fill: "#6366f1",
                  data: riskGroups.bajo.map(toPoint),
                },
                {
                  name: `Riesgo medio (${riskGroups.medioFloor.toFixed(1)}–${riskGroups.altoFloor.toFixed(1)})`,
                  fill: "#f59e0b",
                  data: riskGroups.medio.map(toPoint),
                },
                {
                  name: `Alto riesgo (≥${riskGroups.altoFloor.toFixed(1)})`,
                  fill: "#ef4444",
                  data: riskGroups.alto.map(toPoint),
                },
              ]}
              xLabel="Discrepancia %"
              yLabel="Entregas tardías %"
              xFormatter={(v) => `${v.toFixed(1)}%`}
              yFormatter={(v) => `${v.toFixed(1)}%`}
              referenceLines={axisRefLines}
              tooltipExtra={(pt) => {
                const scoreAttrs: { label: string; fmt: (v: number) => string }[] = [
                  { label: "Discrepancia",   fmt: (v) => `${v.toFixed(1)}%` },
                  { label: "Entrega tardía", fmt: (v) => `${v.toFixed(1)}%` },
                ];
                const score       = pt.meta?.["Score de riesgo"] as number | undefined;
                const fiabilidad  = pt.meta?.["Fiabilidad"]      as number | undefined;
                return (
                  <div className="mt-1 space-y-1">
                    {scoreAttrs.map(({ label, fmt }) => {
                      const val = pt.meta?.[label] as number | undefined;
                      return (
                        <div key={label} className="flex justify-between gap-4">
                          <span className="text-gray-400">{label}</span>
                          <span className="font-mono text-gray-700">{val != null ? fmt(val) : "—"}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-200 pt-1 flex justify-between gap-4">
                      <span className="text-gray-600 font-semibold">Score de riesgo</span>
                      <span className="font-mono font-bold text-gray-900">{score != null ? score.toFixed(1) : "—"}</span>
                    </div>
                    {fiabilidad != null && (
                      <div className="flex justify-between gap-4 pt-0.5">
                        <span className="text-gray-300 italic">Fiabilidad (inf.)</span>
                        <span className="font-mono text-gray-400">{fiabilidad.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>

          {/* Detail table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-gray-700 font-semibold text-sm">Ranking detallado por proveedor</p>
              <p className="text-gray-400 text-xs mt-0.5">Ordenado por score de riesgo descendente · {scores.length} proveedores analizados</p>
            </div>
            <ScoresTable rows={scores.slice(0, PAGE)} altoFloor={riskGroups.altoFloor} medioFloor={riskGroups.medioFloor} />
            {scores.length > PAGE && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <ShowMoreButton total={scores.length} onClick={() => setShowScoresAll(true)} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 03 · FRAGILIDAD DEL COMPRADOR ───────────────────────── */}
      {fragility.length > 0 && (
        <section>
          <SectionLabel
            index="03 /"
            title="Exposición y Vulnerabilidad del Comprador"
            subtitle="% del volumen total de compras centralizado en un único proveedor. Identifica qué nodos son altamente dependientes y susceptibles a roturas de stock."
          />
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
              {[
                { label: "Compradores analizados",    value: fragility.length.toString() },
                { label: "Exposición crítica (≥ 80%)", value: fragility.filter((r) => r.top_supplier_pct >= 80).length.toString() },
                { label: "Dependencia media",          value: `${(fragility.reduce((s, r) => s + r.top_supplier_pct, 0) / fragility.length).toFixed(1)}%` },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-gray-50 px-4 py-3 text-center">
                  <p className="text-gray-900 font-mono font-bold tabular-nums">{kpi.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>
            <div className="p-5">
            <div className="space-y-1.5 mb-4">
              {fragility.slice(0, PAGE).map((row, i) => {
                const pct   = row.top_supplier_pct;
                const barBg = pct >= 80 ? "bg-red-50" : pct >= 50 ? "bg-amber-50" : "bg-emerald-50";
                return (
                  <div key={row.buyer} className="relative rounded-lg overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${barBg} rounded-lg transition-[width] duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center gap-2 px-3 py-2.5 hover:bg-black/[0.02] transition-colors rounded-lg">
                      <span className="text-gray-400 text-xs w-4 shrink-0 text-right tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate leading-tight">{row.buyer}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5 truncate">
                          {row.region} · {row.supplier_count} proveedores
                        </p>
                      </div>
                      <span className={`font-mono text-sm font-bold tabular-nums shrink-0 ${fragilityTextColor(pct)}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {fragility.length > PAGE && (
              <ShowMoreButton total={fragility.length} onClick={() => setShowFragilityAll(true)} />
            )}
            </div>
          </div>
        </section>
      )}

      {/* ── MODALS ──────────────────────────────────────────────── */}
      <SectionModal
        title={`Concentración de Suministros - cuota completa top ${selectedTopN}`}
        open={showBarModal}
        onClose={() => setShowBarModal(false)}
      >
        <div className="p-5">
          <BarList
            data={sliced.map((s) => ({ name: s.name, value: s.share_pct }))}
            color="red"
            valueFormatter={(n) => `${n.toFixed(2)}%`}
          />
        </div>
      </SectionModal>

      <SectionModal
        title="Matriz de Riesgo Operativo - ranking completo"
        open={showScoresAll}
        onClose={() => setShowScoresAll(false)}
      >
        <ScoresTable rows={scores} altoFloor={riskGroups.altoFloor} medioFloor={riskGroups.medioFloor} />
      </SectionModal>

      <SectionModal
        title="Vulnerabilidad del Comprador - ranking completo"
        open={showFragilityAll}
        onClose={() => setShowFragilityAll(false)}
      >
        <FragilityTable rows={fragility} />
      </SectionModal>

    </div>
  );
}