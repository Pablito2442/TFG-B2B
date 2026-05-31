"use client";

import {
  ChartBarIcon,
  HashtagIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import SectionHeader     from "@/components/dashboard/SectionHeader";
import TemporalAreaChart from "@/components/dashboard/TemporalAreaChart";

interface TemporalRow {
  date:      string;
  documents: number;
  flagged:   number;
}

interface TemporalSectionProps {
  data: TemporalRow[];
}

export default function TemporalSection({ data }: TemporalSectionProps) {
  const totalDocs    = data.reduce((s, r) => s + r.documents, 0);
  const totalFlagged = data.reduce((s, r) => s + r.flagged,   0);
  const peakRow      = data.reduce(
    (max, r) => r.documents > (max?.documents ?? 0) ? r : max,
    data[0] ?? null
  );
  const firstDate = data[0]?.date ?? "—";
  const lastDate  = data[data.length - 1]?.date ?? "—";
  const spanLabel = firstDate !== "—" ? `${firstDate} → ${lastDate}` : "—";

  const stats = [
    {
      icon:   HashtagIcon,
      label:  "Total documentos",
      value:  totalDocs > 0 ? totalDocs.toLocaleString("es") : "—",
      sub:    "en toda la serie",
      iconBg: "bg-[var(--primary-dim)]",
      color:  "text-[var(--primary)]",
    },
    {
      icon:   ArrowTrendingUpIcon,
      label:  "Mes pico",
      value:  peakRow ? peakRow.documents.toLocaleString("es") : "—",
      sub:    peakRow?.date ?? "—",
      iconBg: "bg-violet-500/10",
      color:  "text-violet-400",
    },
    {
      icon:   CalendarDaysIcon,
      label:  "Período activo",
      value:  data.length > 0 ? `${data.length} meses` : "—",
      sub:    spanLabel,
      iconBg: "bg-blue-500/10",
      color:  "text-blue-400",
    },
    {
      icon:   ExclamationTriangleIcon,
      label:  "Docs irregulares",
      value:  totalFlagged > 0 ? totalFlagged.toLocaleString("es") : "—",
      sub:    totalDocs > 0
        ? `${((totalFlagged / totalDocs) * 100).toFixed(1)}% del total`
        : "—",
      iconBg: "bg-red-500/10",
      color:  "text-red-400",
    },
  ];

  return (
    <div className="animate-fade-up stagger-1 relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-[oklch(0.60_0.128_158/0.28)] rounded-2xl shadow-lg shadow-[oklch(0.60_0.128_158/0.10)]">
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[oklch(0.60_0.128_158/0.12)] blur-[80px] rounded-full" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[oklch(0.60_0.128_158/0.60)] to-transparent" />

      <div className="px-6 pt-6 pb-2">
        <SectionHeader
          icon={ChartBarIcon}
          title="Evolución de Transacciones Documentales"
          subtitle="Documentos totales e irregulares (discrepancia) por mes."
        />
      </div>

      {data.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 mb-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`p-1 ${s.iconBg} rounded`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} aria-hidden />
                  </div>
                  <span className="text-[var(--text-secondary)] text-[11px] font-semibold">
                    {s.label}
                  </span>
                </div>
                <p className={`text-xl font-black tabular-nums tracking-tight ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-[var(--text-muted)] text-[10px] mt-0.5 font-mono truncate">
                  {s.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            <TemporalAreaChart data={data} />
          </div>
        </>
      ) : (
        <div className="h-72 flex flex-col items-center justify-center px-6 pb-6 text-center">
          <ChartBarIcon className="w-8 h-8 text-[var(--text-muted)] mb-3" />
          <p className="text-[var(--text-secondary)] text-sm font-medium">Sin datos temporales</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Ejecuta el pipeline para visualizar el flujo de documentos.
          </p>
        </div>
      )}
    </div>
  );
}
