"use client";

import { useState } from "react";
import { Treemap, ResponsiveContainer } from "recharts";

export interface TreemapItem {
  name:       string;
  size:       number;
  fill?:      string;
  subtitle?:  string;
  companies?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface TreemapChartProps {
  data:         TreemapItem[];
  height?:      number;
  aspectRatio?: number;
  showLegend?:  boolean;
  colors?:      string[];
}

const DEFAULT_COLORS = [
  "#6366f1","#8b5cf6","#14b8a6","#3b82f6","#ec4899",
  "#f97316","#10b981","#f59e0b","#ef4444","#06b6d4",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Cell({ x, y, width, height, name, size, total, fill, depth, companies, onCellClick }: any) {
  if (depth === 0) return null;

  const pct      = total > 0 ? ((size / total) * 100).toFixed(1) : null;
  const heroSize = Math.min(Math.max(Math.floor(Math.sqrt(width * height) / 5), 13), 32);
  const showHero = width > 44 && height > 30;
  const showName = width > 72 && height > 58;
  const showPct  = width > 84 && height > 78 && pct;

  const centerY = y + height / 2;
  const nameY   = centerY - heroSize / 2 - 7;
  const heroY   = centerY + (showName ? 12 : 0) - (showPct ? heroSize / 4 : 0);
  const pctY    = centerY + heroSize / 2 + 10;

  const clickable = !!onCellClick;

  return (
    <g
      onClick={() => clickable && onCellClick({ name, size, companies })}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={fill} stroke="white" strokeWidth={2} rx={6}
      />
      {showName && (
        <text
          x={x + width / 2} y={nameY}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fillOpacity={0.75} fontSize={10} fontWeight={600}
        >
          {name}
        </text>
      )}
      {showHero && (
        <text
          x={x + width / 2} y={heroY}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize={heroSize} fontWeight={800}
        >
          {size}
        </text>
      )}
      {showPct && (
        <text
          x={x + width / 2} y={pctY}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fillOpacity={0.6} fontSize={9} fontWeight={500}
        >
          {pct}%
        </text>
      )}
    </g>
  );
}

export default function TreemapChart({
  data,
  height = 280,
  aspectRatio = 4 / 3,
  showLegend = true,
  colors = DEFAULT_COLORS,
}: TreemapChartProps) {
  const [selected, setSelected] = useState<TreemapItem | null>(null);
  const [showAll,  setShowAll]  = useState(false);

  const total = data.reduce((s, d) => s + d.size, 0);
  const enriched = data.map((item, i) => ({
    ...item,
    fill:     item.fill ?? colors[i % colors.length],
    subtitle: item.subtitle ?? `${item.size} elementos`,
    total,
  }));

  function handleCellClick(item: TreemapItem) {
    if (selected?.name === item.name) {
      setSelected(null);
    } else {
      setSelected(item);
      setShowAll(false);
    }
  }

  const companies = selected?.companies ?? [];

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={enriched}
          dataKey="size"
          aspectRatio={aspectRatio}
          isAnimationActive={false}
          content={<Cell onCellClick={handleCellClick} />}
        />

      </ResponsiveContainer>

      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-gray-100">
          {enriched.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
              {d.name}
              <span className="text-gray-400 font-mono">
                ({d.size} · {total > 0 ? ((d.size / total) * 100).toFixed(1) : 0}%)
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Inline company panel ─────────────────────────────────── */}
      {selected && (
        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {selected.size} empresas en este ecosistema
                {companies.length < selected.size && (
                  <span> · {companies.length} disponibles en la muestra</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none px-1"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Company table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-gray-400 text-[10px] font-semibold uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-2.5 text-left text-gray-400 text-[10px] font-semibold uppercase tracking-wide">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? companies : companies.slice(0, 10)).map((company, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-900">{company}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* "Ver todas" footer */}
          {!showAll && companies.length > 10 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowAll(true)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
              >
                Ver todas ({companies.length} empresas) →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}