"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface RingSegment {
  name:  string;
  value: number;
  color: string;
}

interface RingChartProps {
  data:              RingSegment[];
  centerLabel:       string;
  centerSub?:        string;
  formatHoverValue?: (value: number, total: number) => string;
  height?:           number;
  centerLabelClass?: string;
  showHoverBar?:     boolean;
  showLegend?:       boolean;
}

export default function RingChart({
  data,
  centerLabel,
  centerSub,
  formatHoverValue,
  height = 180,
  centerLabelClass = "text-xl font-black",
  showHoverBar = true,
  showLegend   = true,
}: RingChartProps) {
  const total  = data.reduce((s, d) => s + d.value, 0);
  const [active, setActive] = useState<RingSegment | null>(null);

  return (
    <div>
      {/* Chart */}
      <div className="relative select-none [&_path]:outline-none [&_svg]:outline-none">
        <ResponsiveContainer width="100%" height={height} minWidth={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius="54%" outerRadius="78%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
              onMouseEnter={(entry) => setActive({ name: entry.name as string, value: entry.value as number, color: entry.fill as string })}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((seg) => (
                <Cell
                  key={seg.name}
                  fill={seg.color}
                  opacity={active && active.name !== seg.name ? 0.35 : 1}
                  style={{ transition: "opacity 0.15s" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className={`text-gray-900 tabular-nums leading-none ${centerLabelClass}`}>
            {centerLabel}
          </p>
          {centerSub && (
            <p className="text-gray-400 text-[10px] font-medium mt-0.5">{centerSub}</p>
          )}
        </div>
      </div>

      {/* Hover detail bar */}
      {showHoverBar && (
        <div className="mt-2 h-9 flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 transition-all duration-150">
          {active ? (
            <>
              <span className="w-2 h-2 rounded-full shrink-0 mr-2" style={{ background: active.color }} />
              <span className="text-xs font-semibold text-gray-800 mr-2 truncate">{active.name}</span>
              {formatHoverValue && (
                <span className="ml-auto text-xs font-mono text-gray-500 shrink-0">
                  {formatHoverValue(active.value, total)}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-gray-400">Pasa el cursor sobre un segmento</span>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {data.map((seg) => (
            <div key={seg.name} className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="text-gray-500 text-[10px] truncate">{seg.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}