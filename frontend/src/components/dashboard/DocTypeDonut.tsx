"use client";

import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
} from "recharts";

const DOC_TYPE_HEX: Record<string, string> = {
  INVOICE:      "#26b5a0",
  ORDER:        "#60a5fa",
  SHIPMENT:     "#34d399",
  CREDIT_NOTE:  "#fbbf24",
  DESADV:       "#a78bfa",
  RECEIPT:      "#fb7185",
  REMITTANCE:   "#fb923c",
};
const FALLBACK_HEX = "#6366f1";

interface DocTypeDonutProps {
  data: { name: string; value: number }[];
}

export default function DocTypeDonut({ data }: DocTypeDonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="78%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={DOC_TYPE_HEX[entry.name] ?? FALLBACK_HEX}
                />
              ))}
            </Pie>
            <PieTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                const pct = total > 0
                  ? ((d.value as number / total) * 100).toFixed(1)
                  : "0";
                return (
                  <div className="px-3 py-2 rounded-xl bg-[oklch(0.12_0_0)] border border-white/[0.10] text-xs shadow-xl">
                    <p className="font-semibold text-white">{d.name}</p>
                    <p className="text-[var(--text-secondary)] mt-0.5">
                      {Intl.NumberFormat("es").format(d.value as number)} docs
                      <span className="ml-1.5 text-[var(--text-muted)]">({pct}%)</span>
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[var(--text-primary)] text-2xl font-black tabular-nums leading-none">
            {Intl.NumberFormat("es").format(total)}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] font-medium mt-0.5">documentos</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: DOC_TYPE_HEX[d.name] ?? FALLBACK_HEX }}
            />
            <span className="text-[var(--text-muted)] text-[10px] truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
