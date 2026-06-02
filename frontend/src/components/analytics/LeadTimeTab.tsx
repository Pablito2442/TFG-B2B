"use client";

import { Card, Title, Text, Flex, BarChart, ProgressBar } from "@tremor/react";
import type { LeadTimeRow } from "@/types/analytics";
import { EMPTY, SIGN } from "./shared";

interface Props { leadTime: LeadTimeRow[]; }

export function LeadTimeTab({ leadTime }: Props) {
  if (leadTime.length === 0) return EMPTY;

  return (
    <div className="space-y-6">
      <Card className="bg-[#1E212B] border-slate-800">
        <Title className="text-white mb-1">Retraso medio por categoría de producto</Title>
        <Text className="text-slate-400 mb-4">
          Días respecto al baseline. Negativo = adelantado; positivo = tarde.
        </Text>
        <BarChart
          className="h-72"
          data={leadTime}
          index="category"
          categories={["avg_delay_days"]}
          colors={["blue"]}
          valueFormatter={(n) => `${SIGN(n)}${n} d`}
          showLegend={false}
        />
      </Card>

      <Card className="bg-[#1E212B] border-slate-800">
        <Title className="text-white mb-3">% entregas tardías</Title>
        <div className="space-y-3">
          {leadTime.map((row) => (
            <div key={row.category}>
              <Flex className="mb-1">
                <Text className="text-slate-300 text-sm">{row.category}</Text>
                <Text className={`text-sm font-mono ${row.late_pct >= 60 ? "text-red-400" : row.late_pct >= 40 ? "text-amber-400" : "text-emerald-400"}`}>
                  {row.late_pct}% ({row.late_count.toLocaleString()} / {row.sample.toLocaleString()})
                </Text>
              </Flex>
              <ProgressBar
                value={row.late_pct}
                color={row.late_pct >= 60 ? "red" : row.late_pct >= 40 ? "yellow" : "emerald"}
                className="h-1.5"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}