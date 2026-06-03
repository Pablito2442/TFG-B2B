"use client";

import {
  Card, Title, Text, Badge, Flex, ProgressBar,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { GdsData } from "@/types/analytics";

interface Props { gds: GdsData; }

function RoleBadge({ role }: { role: string }) {
  const color = role === "SUPPLIER" ? "teal" : role === "BUYER" ? "violet" : "blue";
  return <Badge color={color}>{role}</Badge>;
}

function SectionLabel({ index, title, subtitle }: { index: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span className="text-[var(--primary)] font-mono text-xs opacity-60">{index}</span>
      <div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <p className="text-slate-500 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

export function GdsTab({ gds }: Props) {
  const hasData =
    gds.bottlenecks.length > 0 ||
    gds.communities.length > 0 ||
    gds.pagerank.length > 0 ||
    gds.wcc?.total_components > 0;

  if (!hasData) {
    return (
      <Card className="bg-[#1E212B] border-slate-800 text-center py-12">
        <Text className="text-slate-500">
          GDS no ha sido ejecutado. Descomenta las llamadas en{" "}
          <code className="text-[var(--primary)]">run_analyze.py</code> y re-ejecuta el pipeline.
        </Text>
      </Card>
    );
  }

  const maxPagerank = gds.pagerank[0]?.pagerank_score ?? 1;

  return (
    <div className="space-y-8">

      {/* ── 01 · NETWORK HEALTH ─────────────────────────────────── */}
      {gds.wcc?.total_components > 0 && (
        <section>
          <SectionLabel
            index="01 /"
            title="Salud de la Red"
            subtitle="¿Se fragmentaría la cadena de suministro en una crisis global?"
          />
          <Card className="bg-[#1E212B] border-slate-800">
            <div className="grid grid-cols-3 divide-x divide-slate-700">
              <div className="px-6 py-4 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Tasa de Cohesión</p>
                <p
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: gds.wcc.main_component_pct >= 90 ? "var(--primary)" : gds.wcc.main_component_pct >= 70 ? "#f59e0b" : "#ef4444" }}
                >
                  {gds.wcc.main_component_pct.toFixed(1)}%
                </p>
                <p className="text-slate-500 text-xs mt-1">empresas en el componente principal</p>
              </div>
              <div className="px-6 py-4 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Componentes Totales</p>
                <p className="text-4xl font-bold text-white tabular-nums">{gds.wcc.total_components}</p>
                <p className="text-slate-500 text-xs mt-1">subgrafos desconectados</p>
              </div>
              <div className="px-6 py-4 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Nodos Aislados</p>
                <p className="text-4xl font-bold text-slate-300 tabular-nums">{gds.wcc.isolated_nodes}</p>
                <p className="text-slate-500 text-xs mt-1">empresas sin ningún enlace</p>
              </div>
            </div>
            {gds.wcc.components.length > 1 && (
              <div className="px-6 pb-4 pt-2 border-t border-slate-700 mt-2">
                <p className="text-slate-500 text-xs mb-2">Distribución de tamaños (top {gds.wcc.components.length})</p>
                <div className="space-y-1.5">
                  {gds.wcc.components.map((c) => (
                    <div key={c.component_id} className="flex items-center gap-3">
                      <span className="text-slate-500 font-mono text-xs w-20 shrink-0">#{c.component_id}</span>
                      <ProgressBar
                        value={(c.size / gds.wcc.main_component_size) * 100}
                        color="indigo"
                        className="h-1.5 flex-1"
                      />
                      <span className="text-slate-300 text-xs tabular-nums w-10 text-right shrink-0">{c.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ── 02 · MARKET ECOSYSTEMS ──────────────────────────────── */}
      {gds.communities.length > 0 && (
        <section>
          <SectionLabel
            index="02 /"
            title="Ecosistemas de Mercado"
            subtitle="¿Existen clusters comerciales ocultos dentro de la red de proveedores?"
          />
          <Card className="bg-[#1E212B] border-slate-800">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="text-slate-400">Cluster</TableHeaderCell>
                  <TableHeaderCell className="text-slate-400 text-right">Empresas</TableHeaderCell>
                  <TableHeaderCell className="text-slate-400">Empresas de ejemplo</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gds.communities.map((row, i) => (
                  <TableRow key={row.communityId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{i + 1}</span>
                        <span className="text-[var(--primary)] font-mono">#{row.communityId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-right font-mono">{row.total_empresas}</TableCell>
                    <TableCell className="text-slate-400 text-xs">
                      {(row.ejemplos_empresas ?? []).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* ── 03 · SINGLE POINTS OF FAILURE ──────────────────────── */}
      {(gds.bottlenecks.length > 0 || gds.pagerank.length > 0) && (
        <section>
          <SectionLabel
            index="03 /"
            title="Puntos Únicos de Fallo"
            subtitle="¿Qué proveedores requieren auditoría estricta porque su caída paralizaría la red?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Betweenness — structural bridges */}
            {gds.bottlenecks.length > 0 && (
              <Card className="bg-[#1E212B] border-slate-800">
                <Title className="text-white mb-1">Cuellos de Botella</Title>
                <Text className="text-slate-400 text-xs mb-4">
                  Nodos &ldquo;puente&rdquo; que conectan comunidades distintas — alta intermediación estructural.
                </Text>
                <div className="space-y-3">
                  {gds.bottlenecks.map((row, i) => (
                    <div key={row.company_id}>
                      <Flex className="mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                          <span className="text-white text-sm truncate">{row.legal_name}</span>
                          <RoleBadge role={row.role} />
                        </div>
                        <span className="text-amber-400 font-mono text-xs shrink-0">
                          {row.normalized_pct.toFixed(2)}% de rutas
                        </span>
                      </Flex>
                      <ProgressBar
                        value={row.normalized_pct}
                        color="amber"
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* PageRank — systemic titans */}
            {gds.pagerank.length > 0 && (
              <Card className="bg-[#1E212B] border-slate-800">
                <Title className="text-white mb-1">Titanes Sistémicos</Title>
                <Text className="text-slate-400 text-xs mb-4">
                  Proveedores de alto volumen y alta conectividad — estructuralmente &ldquo;demasiado grandes para caer&rdquo;.
                </Text>
                <div className="space-y-3">
                  {gds.pagerank.map((row, i) => (
                    <div key={row.company_id}>
                      <Flex className="mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                          <span className="text-white text-sm truncate">{row.legal_name}</span>
                          <RoleBadge role={row.role} />
                        </div>
                        <span className="text-indigo-400 font-mono text-xs shrink-0">
                          {row.pagerank_score.toFixed(4)}
                        </span>
                      </Flex>
                      <ProgressBar
                        value={(row.pagerank_score / maxPagerank) * 100}
                        color="indigo"
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>
        </section>
      )}

    </div>
  );
}