"use client";

import {
  Card, Title, Text, BarChart,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { PaymentRow } from "@/types/analytics";
import { EMPTY, EUR } from "./shared";

interface Props { payment: PaymentRow[]; }

export function ExposureTab({ payment }: Props) {
  if (payment.length === 0) return EMPTY;

  return (
    <div className="space-y-6">
      <Card className="bg-[#1E212B] border-slate-800">
        <Title className="text-white mb-1">Exposición financiera por proveedor</Title>
        <Text className="text-slate-400 mb-4">Suma total de importes de facturas emitidas (top-15).</Text>
        <BarChart
          className="h-64"
          data={[...payment].reverse()}
          index="supplier"
          categories={["total_exposure_eur"]}
          colors={["violet"]}
          layout="vertical"
          valueFormatter={(n) => `${EUR(n)} €`}
          showLegend={false}
        />
      </Card>

      <Card className="bg-[#1E212B] border-slate-800">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="text-slate-400">Proveedor</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Exposición (€)</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Pago medio (d)</TableHeaderCell>
              <TableHeaderCell className="text-slate-400 text-right">Nº Facturas</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payment.map((row, i) => (
              <TableRow key={row.supplier}>
                <TableCell className="text-white font-medium">
                  {i === 0 && <span className="mr-2 text-amber-400">★</span>}
                  {row.supplier}
                </TableCell>
                <TableCell className="text-[var(--primary)] text-right font-mono font-semibold">
                  {EUR(row.total_exposure_eur)} €
                </TableCell>
                <TableCell className="text-slate-400 text-right">{row.avg_payment_days}</TableCell>
                <TableCell className="text-slate-400 text-right">{row.invoice_count.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}