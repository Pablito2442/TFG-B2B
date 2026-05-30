"use client";

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
  data: { date: string; documents: number }[];
}

export default function TemporalAreaChart({ data }: TemporalAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={288}>
      <RechAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "oklch(0.68 0.012 158)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tickFormatter={(n: number) =>
            Intl.NumberFormat("es", { notation: "compact" }).format(n)
          }
        />
        <AreaTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="px-3 py-2 rounded-xl bg-[oklch(0.12_0_0)] border border-white/[0.10] text-xs shadow-xl">
                <p className="text-[var(--text-muted)] mb-0.5">{label}</p>
                <p className="font-semibold text-white">
                  {Intl.NumberFormat("es").format(payload[0].value as number)} documentos
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="documents"
          stroke="#26b5a0"
          strokeWidth={2}
          fill="url(#areaGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#26b5a0", stroke: "oklch(0.08 0 0)", strokeWidth: 2 }}
        />
      </RechAreaChart>
    </ResponsiveContainer>
  );
}
