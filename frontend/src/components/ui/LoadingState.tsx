"use client";

/* ── LoadingState ───────────────────────────────────────────────
   Skeleton shimmer for data-heavy pages (skill: progressive-loading).
   Uses CSS animation from globals.css; respects prefers-reduced-motion.
──────────────────────────────────────────────────────────────── */

interface LoadingProps {
  text?: string;
}

export function LoadingState({ text = "Cargando..." }: LoadingProps) {
  return (
    <main className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-up">

      {/* Header skeleton */}
      <div className="space-y-2 pb-2 border-b border-white/[0.07]">
        <div className="h-3 w-32 rounded-full bg-white/[0.06] shimmer" />
        <div className="h-7 w-56 rounded-xl bg-white/[0.06] shimmer" />
        <div className="h-3 w-72 rounded-full bg-white/[0.05] shimmer" />
      </div>

      {/* KPI card skeletons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] shrink-0 shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-white/[0.05] shimmer" />
              <div className="h-7 w-16 rounded-lg bg-white/[0.07] shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] shimmer" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-48 rounded-full bg-white/[0.06] shimmer" />
            <div className="h-2.5 w-64 rounded-full bg-white/[0.04] shimmer" />
          </div>
        </div>
        <div className="h-72 rounded-xl bg-white/[0.03] shimmer" />
      </div>

      {/* Loading label */}
      <p className="text-center text-[var(--text-muted)] text-sm animate-pulse">{text}</p>

    </main>
  );
}

/* ── ErrorState ─────────────────────────────────────────────── */
interface ErrorProps {
  title?:   string;
  message?: string;
}

export function ErrorState({
  title   = "Sin datos",
  message = "Ejecuta primero el pipeline desde /pipeline.",
}: ErrorProps) {
  return (
    <main className="p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="text-[#f1f5f9] font-semibold text-lg">{title}</p>
          <p className="text-[#64748b] text-sm mt-1.5 leading-relaxed">{message}</p>
        </div>
        <a
          href="/pipeline"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-[#f1f5f9] text-sm font-medium hover:bg-white/[0.08] transition-colors duration-200"
        >
          Ir al Pipeline →
        </a>
      </div>
    </main>
  );
}