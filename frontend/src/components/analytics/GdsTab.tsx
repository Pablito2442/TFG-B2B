"use client";

import {
  Card, Title, Text, Grid, Badge, Flex, ProgressBar,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { GdsData } from "@/types/analytics";

interface Props { gds: GdsData; }

export function GdsTab({ gds }: Props) {
  const maxScore = gds.bottlenecks[0]?.betweenness_score ?? 1;

  if (gds.bottlenecks.length === 0 && gds.communities.length === 0) {
    return (
      <Card className="bg-[#1E212B] border-slate-800 text-center py-12">
        <Text className="text-slate-500">
          GDS no ha sido ejecutado. Descomenta las llamadas en{" "}
          <code className="text-[var(--primary)]">run_analyze.py</code> y re-ejecuta el pipeline.
        </Text>
      </Card>
    );
  }

  return (
    <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
      {gds.bottlenecks.length > 0 && (
        <Card className="bg-[#1E212B] border-slate-800">
          <Title className="text-white mb-1">Cuellos de Botella</Title>
          <Text className="text-slate-400 mb-4">
            Top-10 por centralidad de intermediación. Barra = score relativo al máximo.
          </Text>
          <div className="space-y-3">
            {gds.bottlenecks.map((row, i) => (
              <div key={row.company_id}>
                <Flex className="mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="text-white text-sm truncate">{row.legal_name}</span>
                    <Badge color={row.role === "SUPPLIER" ? "teal" : row.role === "BUYER" ? "violet" : "blue"}>
                      {row.role}
                    </Badge>
                  </div>
                  <span className="text-amber-400 font-mono text-sm shrink-0">
                    {row.betweenness_score.toFixed(4)}
                  </span>
                </Flex>
                <ProgressBar
                  value={(row.betweenness_score / maxScore) * 100}
                  color="amber"
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {gds.communities.length > 0 && (
        <Card className="bg-[#1E212B] border-slate-800">
          <Title className="text-white mb-1">Comunidades Louvain</Title>
          <Text className="text-slate-400 mb-4">Ecosistemas logísticos detectados.</Text>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-slate-400">Cluster</TableHeaderCell>
                <TableHeaderCell className="text-slate-400 text-right">Empresas</TableHeaderCell>
                <TableHeaderCell className="text-slate-400">Ejemplos</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gds.communities.map((row) => (
                <TableRow key={row.communityId}>
                  <TableCell className="text-[var(--primary)] font-mono">#{row.communityId}</TableCell>
                  <TableCell className="text-white text-right">{row.total_empresas}</TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {(row.ejemplos_empresas ?? []).join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Grid>
  );
}