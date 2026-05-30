"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  MagnifyingGlassCircleIcon,
  DocumentMagnifyingGlassIcon,
  UsersIcon,
  BoltIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/solid";

const SpainMap = dynamic(() => import("@/components/charts/SpainMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="w-7 h-7 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      <span className="ml-3 text-[var(--text-secondary)] text-sm">Cargando mapa geográfico...</span>
    </div>
  ),
});

const STATS = [
  { value: "300+", label: "Empresas sintéticas",  accent: "text-[var(--primary)]",  glow: "group-hover:shadow-[oklch(0.60_0.128_158/0.12)]" },
  { value: "10k+", label: "Documentos EDI",        accent: "text-[var(--accent)]",   glow: "group-hover:shadow-[oklch(0.72_0.162_68/0.12)]"  },
  { value: "9",    label: "Métodos analíticos",    accent: "text-violet-400",         glow: "group-hover:shadow-violet-500/10"                  },
  { value: "7",    label: "Tipos de relación",     accent: "text-emerald-400",        glow: "group-hover:shadow-emerald-500/10"                 },
];

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: "Graph Analytics",
    description: "Centralidad de intermediación y detección de comunidades logísticas con Neo4j GDS.",
    color: "text-[var(--primary)]",  bg: "bg-[var(--primary-dim)]",  border: "border-[oklch(0.60_0.128_158/0.20)] hover:border-[oklch(0.60_0.128_158/0.50)]",  href: "/analytics",
  },
  {
    icon: BoltIcon,
    title: "Real-time Monitoring",
    description: "KPIs macro de la red, distribución temporal y georreferenciación de empresas activas.",
    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20   hover:border-blue-500/50",   href: "/dashboard",
  },
  {
    icon: ShieldCheckIcon,
    title: "Risk Detection",
    description: "Concentración de proveedores, score de riesgo compuesto y fragilidad de compradores.",
    color: "text-[var(--accent)]",  bg: "bg-[var(--accent-dim)]",  border: "border-[oklch(0.72_0.162_68/0.20)] hover:border-[oklch(0.72_0.162_68/0.50)]",  href: "/analytics",
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: "Data Lineage",
    description: "Trazabilidad documental: rastrea facturas con discrepancia hasta el pedido origen.",
    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20  hover:border-amber-500/50",  href: "/analytics",
  },
  {
    icon: UsersIcon,
    title: "Community Detection",
    description: "Algoritmo Louvain con pesos de volumen acordado para identificar ecosistemas logísticos.",
    color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20 hover:border-violet-500/50", href: "/analytics",
  },
  {
    icon: AdjustmentsHorizontalIcon,
    title: "Pipeline Automation",
    description: "Generación LFR, carga batch en Neo4j y exportación de resultados con un clic.",
    color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20 hover:border-emerald-500/50",href: "/pipeline",
  },
];

const STAGGER = ["stagger-1","stagger-2","stagger-3","stagger-4","stagger-5","stagger-6"] as const;

const TRUST = [
  { name: "Neo4j",    label: "Graph DB + GDS",  color: "text-[#008CC1]", bg: "bg-[#008CC1]/10 border-[#008CC1]/20" },
  { name: "FastAPI",  label: "REST Backend",    color: "text-[#009688]", bg: "bg-[#009688]/10 border-[#009688]/20" },
  { name: "Next.js",  label: "Frontend",        color: "text-white",     bg: "bg-white/5 border-white/10"          },
  { name: "Docker",   label: "Infrastructure",  color: "text-[#2496ED]", bg: "bg-[#2496ED]/10 border-[#2496ED]/20" },
  { name: "Python",   label: "ETL & Analytics", color: "text-[#3776AB]", bg: "bg-[#3776AB]/10 border-[#3776AB]/20" },
  { name: "Tailwind", label: "UI Styling",      color: "text-[#38BDF8]", bg: "bg-[#38BDF8]/10 border-[#38BDF8]/20" },
];

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)]">

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="hero-grid relative overflow-hidden pt-24 pb-20 px-6">
        {/* radial glow — teal, not cyan */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="w-[680px] h-[340px] rounded-full bg-[oklch(0.60_0.128_158/0.10)] blur-[110px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8">

          {/* badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[oklch(0.60_0.128_158/0.25)] bg-[var(--primary-dim)] text-[var(--primary)] text-xs font-semibold tracking-wide">
            <GlobeAltIcon className="w-3.5 h-3.5 shrink-0" />
            TFG · Master&apos;s Thesis · Neo4j + LFR Graphs
          </div>

          {/* headline — solid colors, no gradient text */}
          <h1 className="animate-fade-up stagger-1 text-5xl md:text-[4.25rem] font-black text-[var(--text-primary)] leading-[1.06] tracking-tight text-wrap-balance">
            Inteligencia de Grafos<br />
            <span className="text-[var(--accent)]">
              para Supply Chains
            </span>
          </h1>

          {/* body */}
          <p className="animate-fade-up stagger-2 text-[var(--text-secondary)] text-lg md:text-xl max-w-2xl mx-auto leading-[1.75]">
            Detecta cuellos de botella, rastrea discrepancias documentales y analiza
            la topología de redes B2B mediante grafos sintéticos y Graph Data Science.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up stagger-3 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="glow-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
            >
              Ver Dashboard <ChartBarIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/10 bg-white/[0.04] text-[var(--text-primary)] font-semibold text-sm transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20"
            >
              Explorar Analítica <MagnifyingGlassCircleIcon className="w-4 h-4 text-[var(--text-muted)]" />
            </Link>
          </div>

          {/* stat strip */}
          <div className="animate-fade-up stagger-4 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {STATS.map((s) => (
              <div
                key={s.label}
                className={`group bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 text-center transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-lg ${s.glow}`}
              >
                <p className={`text-[2rem] font-black leading-none tabular-nums ${s.accent}`}>{s.value}</p>
                <p className="text-[var(--text-muted)] text-xs mt-1.5 font-medium leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION SEPARATOR ─────────────────────────────────────────── */}
      <div aria-hidden className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[var(--shadow-glow-primary)] shrink-0" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </div>
      </div>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section className="px-6 pt-14 pb-20 max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight text-wrap-balance">
            Todo lo necesario para analizar la red
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto text-sm leading-[1.75]">
            Desde la generación sintética hasta la detección topológica de
            vulnerabilidades, en un único sistema integrado.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Link key={f.title} href={f.href} className="cursor-pointer">
              <div
                className={`animate-fade-up ${STAGGER[i]} group h-full bg-white/[0.04] border ${f.border} rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:bg-white/[0.07] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
              >
                <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="text-[var(--text-primary)] font-semibold text-[0.9375rem]">{f.title}</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1.5 leading-[1.65]">{f.description}</p>
                </div>
                <span
                  aria-hidden
                  className={`flex items-center gap-1 text-xs font-medium ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                >
                  Explorar <ArrowRightIcon className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── DIVIDER ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── SPAIN MAP ─────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-7xl mx-auto">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-7 md:p-9">
          <div className="mb-6">
            <p className="text-[var(--text-primary)] font-semibold text-lg">Distribución Geográfica en Tiempo Real</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Empresas activas ancladas a municipios reales de España.
            </p>
          </div>
          <SpainMap />
        </div>
      </section>

      {/* ── DIVIDER ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── TRUST BADGES ──────────────────────────────────────────────── */}
      <section className="px-6 py-14 max-w-7xl mx-auto">
        <p className="text-center text-[var(--text-muted)] text-sm font-medium mb-8">
          Construido con tecnologías de producción
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {TRUST.map((t) => (
            <div
              key={t.name}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.bg} transition-transform duration-200 hover:scale-[1.03]`}
            >
              <span className={`font-bold text-sm ${t.color}`}>{t.name}</span>
              <span className="text-[var(--text-muted)] text-xs">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
