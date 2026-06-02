"use client";

import { useState } from "react";
import {
  Card, Title, Text, Metric, Grid, Flex,
  DonutChart, CategoryBar, BarList,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { RiskData, CommercialImpactRow } from "@/types/analytics";
import { EMPTY, EUR, SIGN, EstadoPill, ShowMoreButton, SectionModal } from "./shared";

const PAGE = 10;

interface Props {
  risk:       RiskData | null;
  commercial: CommercialImpactRow[];
}

function CommercialTable({ rows }: { rows: CommercialImpactRow[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell className="text-slate-400">Pedido</TableHeaderCell>
          <TableHeaderCell className="text-slate-400">Proveedor</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Pedido (€)</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Facturado (€)</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Δ €</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Δ %</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Estado</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.pedido_id}>
            <TableCell className="text-slate-400 font-mono text-xs">{row.pedido_id}</TableCell>
            <TableCell className="text-white text-sm">{row.proveedor}</TableCell>
            <TableCell className="text-slate-300 text-right font-mono">{EUR(row.importe_pedido_eur, 2)}</TableCell>
            <TableCell className="text-slate-300 text-right font-mono">{EUR(row.total_facturado_eur, 2)}</TableCell>
            <TableCell className={`text-right font-mono font-semibold ${row.delta_eur > 0 ? "text-red-400" : row.delta_eur < 0 ? "text-amber-400" : "text-slate-400"}`}>
              {SIGN(row.delta_eur)}{EUR(row.delta_eur, 2)}
            </TableCell>
            <TableCell className={`text-right font-mono text-sm ${row.delta_pct != null && row.delta_pct > 0 ? "text-red-400" : row.delta_pct != null && row.delta_pct < 0 ? "text-amber-400" : "text-slate-400"}`}>
              {row.delta_pct != null ? `${SIGN(row.delta_pct)}${row.delta_pct}%` : "—"}
            </TableCell>
            <TableCell className="text-right"><EstadoPill estado={row.estado_comercial} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RiskTab({ risk, commercial }: Props) {
  const [showCommercialAll, setShowCommercialAll] = useState(false);

  const cmSobre = commercial.filter((r) => r.estado_comercial === "SOBREFACTURADO").length;
  const cmSub   = commercial.filter((r) => r.estado_comercial === "SUBFACTURADO").length;
  const cmOk    = commercial.filter((r) => r.estado_comercial === "CONFORME").length;

  const restPct   = risk ? Math.max(0, 100 - risk.concentration_pct) : 0;
  const donutData = risk
    ? [
        { name: `Top-${risk.top_n} proveedores`, value: risk.concentration_pct },
        { name: "Resto de la red",               value: restPct },
      ]
    : [];

  return (
    <div className="space-y-10">

      {/* Concentración de riesgo */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Concentración de Riesgo</h2>
        {!risk ? EMPTY : (
          <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
            <Card decoration="top" decorationColor="red" className="bg-[#1E212B] border-slate-800 flex flex-col justify-between">
              <Text className="text-slate-400">Concentración Top-{risk.top_n}</Text>
              <Metric className="text-white mt-2">{risk.concentration_pct}%</Metric>
              <Text className="text-slate-500 text-sm mt-1">
                de {risk.total_supplies_edges.toLocaleString()} enlaces SUPPLIES
              </Text>
              <div className="mt-4">
                <CategoryBar
                  values={[risk.concentration_pct, restPct]}
                  colors={["red", "slate"]}
                  className="mt-2"
                />
                <Flex className="mt-1">
                  <Text className="text-red-400 text-xs">Top-{risk.top_n}</Text>
                  <Text className="text-slate-500 text-xs">Resto</Text>
                </Flex>
              </div>
            </Card>

            <Card className="bg-[#1E212B] border-slate-800 flex flex-col items-center justify-center">
              <Title className="text-white mb-2">Distribución de red</Title>
              <DonutChart
                data={donutData}
                category="value"
                index="name"
                colors={["red", "slate"]}
                valueFormatter={(n) => `${n.toFixed(1)}%`}
                className="h-40"
              />
            </Card>

            <Card className="bg-[#1E212B] border-slate-800">
              <Title className="text-white mb-3">Cuota individual por proveedor</Title>
              <BarList
                data={(risk.top_suppliers ?? []).map((s) => ({
                  name: s.name,
                  value: s.share_pct,
                }))}
                color="red"
                valueFormatter={(n: number) => `${n}%`}
              />
            </Card>
          </Grid>
        )}
      </section>

      {/* Impacto Comercial */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Impacto Comercial</h2>
        <p className="text-slate-400 text-sm mb-4">
          Desviación entre importe del pedido y total facturado. Tolerancia ±5%.
        </p>
        {commercial.length === 0 ? EMPTY : (
          <div className="space-y-4">
            <Grid numItemsSm={3} className="gap-4">
              <Card className="bg-red-950/40 border-red-800 text-center">
                <Text className="text-red-400 text-sm">Sobrefacturados</Text>
                <Metric className="text-red-300 mt-1">{cmSobre}</Metric>
              </Card>
              <Card className="bg-amber-950/40 border-amber-800 text-center">
                <Text className="text-amber-400 text-sm">Subfacturados</Text>
                <Metric className="text-amber-300 mt-1">{cmSub}</Metric>
              </Card>
              <Card className="bg-emerald-950/40 border-emerald-800 text-center">
                <Text className="text-emerald-400 text-sm">Conformes</Text>
                <Metric className="text-emerald-300 mt-1">{cmOk}</Metric>
              </Card>
            </Grid>
            <Card className="bg-[#1E212B] border-slate-800">
              <div className="overflow-auto">
                <CommercialTable rows={commercial.slice(0, PAGE)} />
              </div>
              {commercial.length > PAGE && (
                <ShowMoreButton total={commercial.length} onClick={() => setShowCommercialAll(true)} />
              )}
            </Card>
          </div>
        )}
      </section>

      <SectionModal
        title="Impacto Comercial — completo"
        open={showCommercialAll}
        onClose={() => setShowCommercialAll(false)}
      >
        <CommercialTable rows={commercial} />
      </SectionModal>

    </div>
  );
}