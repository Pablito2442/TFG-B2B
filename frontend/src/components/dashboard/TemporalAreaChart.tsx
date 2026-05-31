"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart as RechAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as AreaTooltip,
} from "recharts";

interface TemporalAreaChartProps {
  data: { date: string; documents: number; flagged?: number }[];
}

const RANGES = [
  { label: "6M", months: 6 },
  { label: "1A", months: 12 },
  { label: "2A", months: 24 },
  { label: "Todo", months: null },
] as const;

type RangeLabel = typeof RANGES[number]["label"];

export default function TemporalAreaChart({ data }: TemporalAreaChartProps) {
  const [range, setRange] = useState<RangeLabel>("Todo");

  const selectedMonths = RANGES.find((r) => r.label === range)!.months;
  const filteredData   = selectedMonths ? data.slice(-selectedMonths) : data;
  const hasFlagged     = filteredData.some((r) => (r.flagged ?? 0) > 0);

  return (
    <div>
      {/* Toolbar: legend + range buttons */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        {/* Inline legend */}
        <div className="flex items-center gap-5 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-[2px] bg-[#26b5a0] rounded" />
            Total documentos
          </div>
          {hasFlagged && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-[2px] bg-[#f59e0b] rounded opacity-80" />
              Con discrepancia
            </div>
          )}
        </div>

        {/* Range filter pills */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.07] rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                range === r.label
                  ? "bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/30"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.06]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={272}>
        <RechAreaChart data={filteredData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#26b5a0" stopOpacity={0.70} />
              <stop offset="95%" stopColor="#26b5a0" stopOpacity={0.08} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "oklch(0.68 0.012 158)", fontSize: 11 }}
            axisLine={false} tickLine={false} tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "oklch(0.68 0.012 158)", fontSize: 11 }}
            axisLine={false} tickLine={false} tickMargin={8}
            tickFormatter={(n: number) =>
              Intl.NumberFormat("es", { notation: "compact" }).format(n)
            }
          />

          <AreaTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const docs    = payload.find((p) => p.dataKey === "documents");
              const flagged = payload.find((p) => p.dataKey === "flagged");
              return (
                <div className="px-3 py-2 rounded-xl bg-[oklch(0.12_0_0)] border border-white/[0.10] text-xs shadow-xl">
                  <p className="text-[var(--text-muted)] mb-1">{label}</p>
                  {docs && (
                    <p className="font-semibold text-white">
                      {Intl.NumberFormat("es").format(docs.value as number)} documentos
                    </p>
                  )}
                  {flagged && (flagged.value as number) > 0 && (
                    <p className="text-amber-400 mt-0.5">
                      {Intl.NumberFormat("es").format(flagged.value as number)} con discrepancia
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Primary series — filled teal area */}
          <Area
            type="monotone"
            dataKey="documents"
            stroke="#26b5a0"
            strokeWidth={2}
            fill="url(#areaGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#26b5a0", stroke: "oklch(0.08 0 0)", strokeWidth: 2 }}
          />

          {/* Secondary series — dashed amber line, no fill */}
          {hasFlagged && (
            <Area
              type="monotone"
              dataKey="flagged"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="#f59e0b"
              fillOpacity={0}
              dot={false}
              activeDot={{ r: 3, fill: "#f59e0b", strokeWidth: 1 }}
            />
          )}
        </RechAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
