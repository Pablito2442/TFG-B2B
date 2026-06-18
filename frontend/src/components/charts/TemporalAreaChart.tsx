"use client";

import { useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart as RechAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechTooltip,
} from "recharts";

export interface AreaSeries {
  dataKey: string;
  label:   string;
  color:   string;
  dashed?: boolean;
}

interface TemporalAreaChartProps {
  data:   { date: string }[];
  series: AreaSeries[];
}

const RANGES = [
  { label: "6M",   months: 6    },
  { label: "1A",   months: 12   },
  { label: "2A",   months: 24   },
  { label: "Todo", months: null },
] as const;

type RangeLabel = typeof RANGES[number]["label"];

export default function TemporalAreaChart({ data, series }: TemporalAreaChartProps) {
  const [range, setRange]   = useState<RangeLabel>("Todo");
  const [active, setActive] = useState<Record<string, unknown> | null>(null);
  const activeKey = useRef<string | null>(null);

  const selectedMonths = RANGES.find((r) => r.label === range)!.months;
  const filteredData   = selectedMonths ? data.slice(-selectedMonths) : data;

  const visibleSeries = series.filter((s) =>
    filteredData.some((row) => (((row as Record<string, unknown>)[s.dataKey] as number) ?? 0) > 0)
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-5 text-[11px] text-gray-400">
          {visibleSeries.map((s) => (
            <div key={s.dataKey} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-[2px] rounded"
                style={{ backgroundColor: s.color, opacity: s.dashed ? 0.8 : 1 }}
              />
              {s.label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 border border-gray-200 rounded-lg">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => { setRange(r.label); setActive(null); }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 ${
                range === r.label
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart + fixed left tooltip */}
      <div
        className="relative"
        onMouseLeave={() => { activeKey.current = null; setActive(null); }}
      >
        {active && (
          <div className="absolute left-20 top-0 z-10 pointer-events-none">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs min-w-[140px]">
              <p className="text-gray-400 font-mono mb-1">{active.date as string}</p>
              {visibleSeries.map((s) => (
                <p key={s.dataKey} className="mt-0.5" style={{ color: s.dashed ? s.color : undefined }}>
                  <span className={s.dashed ? "" : "font-semibold text-gray-900"}>
                    {Intl.NumberFormat("es").format((active[s.dataKey] as number) ?? 0)}
                  </span>{" "}
                  {s.label.toLowerCase()}
                </p>
              ))}
            </div>
          </div>
        )}

        <ResponsiveContainer width="100%" height={272} minWidth={1}>
          <RechAreaChart data={filteredData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {visibleSeries.filter((s) => !s.dashed).map((s) => (
                <linearGradient key={s.dataKey} id={`grad_${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.color} stopOpacity={0.70} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.08} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false} tickLine={false} tickMargin={8}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false} tickLine={false} tickMargin={8}
              tickFormatter={(n: number) =>
                Intl.NumberFormat("es", { notation: "compact" }).format(n)
              }
            />

            <RechTooltip
              content={({ active: a, payload, label }) => {
                if (a && payload?.length) {
                  const key = label as string;
                  if (key !== activeKey.current) {
                    activeKey.current = key;
                    const point: Record<string, unknown> = { date: key };
                    series.forEach((s) => {
                      point[s.dataKey] = payload.find((p) => p.dataKey === s.dataKey)?.value ?? 0;
                    });
                    Promise.resolve().then(() => setActive(point));
                  }
                }
                return null;
              }}
              cursor={{ stroke: series[0]?.color ?? "#6366f1", strokeWidth: 1, strokeDasharray: "4 2" }}
              isAnimationActive={false}
            />

            {visibleSeries.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.5 : 2}
                strokeDasharray={s.dashed ? "4 2" : undefined}
                fill={s.dashed ? "none" : `url(#grad_${s.dataKey})`}
                dot={false}
                activeDot={{
                  r:           s.dashed ? 3 : 4,
                  fill:        s.color,
                  stroke:      s.dashed ? undefined : "#fff",
                  strokeWidth: s.dashed ? 1 : 2,
                }}
              />
            ))}
          </RechAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
