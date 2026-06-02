"use client";

import {
  Card, Title, Text, Badge, BarChart,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { DiscrepancyRow } from "@/types/analytics";
import { EMPTY, rateBadge } from "./shared";

interface Props { discrepancy: DiscrepancyRow[]; }

export function DiscrepanciesTab({ discrepancy }: Props) {
  if (discrepancy.length === 0) return EMPTY;

  return (
    <div className="space-y-6">
      <Card className="bg-[#1E212B] border-slate-800">
        <Title className="text-white mb-1">Tasa de discrepancia por proveedor</Title>
        <Text className="text-slate-400 mb-4">Top-20, mínimo 5 facturas emitidas.</Text>
        <BarChart
          className="h-64"
          data={[...discrepancy].reverse()}
          index="supplier"
          categories={["discrepancy_rate_pct"]}
          colors={["red"]}
          layout="vertical"
          valueFormatter={(n) => `${n}%`}
          showLegend={false}
        />
      </Card>

      <Card className="bg-[#1E212B] border-slate-800">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-slate-400">Proveedor</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Facturas</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Con error</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Tasa</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {discrepancy.map((row) => (
              <TableRow key={row.supplier}>
                <TableCell className="text-white font-medium">{row.supplier}</TableCell>
                <TableCell className="text-slate-400 text-right">{row.total.toLocaleString()}</TableCell>
                <TableCell className="text-slate-400 text-right">{row.flagged.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Badge color={rateBadge(row.discrepancy_rate_pct)}>
                    {row.discrepancy_rate_pct}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}