import AnimatedNetworkGraph from "./AnimatedNetworkGraph";
import { BRAND } from "@/lib/brand";

const CAPABILITIES = [
  {
    stat: "LFR", label: "Generación de grafos",
    detail: "Redes sintéticas con topología scale-free y comunidades realistas.",
    pulseDelay: "0ms", enterDelay: "520ms",
  },
  {
    stat: "GDS", label: "Graph Data Science",
    detail: "Centralidad de intermediación y detección de comunidades Louvain.",
    pulseDelay: "300ms", enterDelay: "640ms",
  },
  {
    stat: "EDI", label: "Trazabilidad documental",
    detail: "Cadena completa orden → factura con scoring de discrepancia.",
    pulseDelay: "600ms", enterDelay: "760ms",
  },
];

export default function BrandPanel() {
  return (
    <div
      className="hidden lg:flex w-[40%] bg-gray-900 border-r border-gray-800 flex-col relative overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Brand header — slides in from left */}
      <div
        className="px-6 py-5 flex items-center gap-4 z-10 shrink-0 animate-fade-left"
        style={{ animationDelay: "0ms" }}
      >
        <div className="w-10 h-10 rounded-lg bg-indigo-600 border border-indigo-500 flex items-center justify-center shrink-0">
          <NetworkIcon />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white leading-none">{BRAND.name}</h1>
          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500 mt-0.5">{BRAND.subtitle}</p>
        </div>
      </div>

      {/* Map area — pure fade so the large element doesn't jump */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden px-8 min-h-0 animate-fade-in"
        style={{ animationDelay: "180ms" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 70%)" }}
        />
        <div className="w-full relative">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-20 z-10"
            style={{ background: "linear-gradient(to bottom, #111827 0%, transparent 100%)" }} />
          <AnimatedNetworkGraph />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 z-10"
            style={{ background: "linear-gradient(to top, #111827 0%, transparent 100%)" }} />
        </div>
      </div>

      {/* Description section — fades up from below */}
      <div className="px-12 pb-12 pt-4 z-10 shrink-0">
        <h2
          className="text-lg font-semibold text-white mb-1.5 animate-fade-up"
          style={{ animationDelay: "340ms" }}
        >
          Trazabilidad B2B
        </h2>
        <p
          className="text-sm text-gray-400 mb-7 max-w-sm leading-relaxed animate-fade-up"
          style={{ animationDelay: "420ms" }}
        >
          {BRAND.description}
        </p>

        {/* Capability items — each enters individually */}
        <ul className="space-y-5">
          {CAPABILITIES.map((cap) => (
            <li
              key={cap.stat}
              className="flex items-start gap-3 animate-fade-up"
              style={{ animationDelay: cap.enterDelay }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 animate-pulse"
                style={{ animationDelay: cap.pulseDelay }}
              />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-indigo-400">{cap.stat}</span>
                  <span className="text-sm font-medium text-gray-200">{cap.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cap.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NetworkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" aria-hidden>
      <circle cx="8" cy="8" r="2.5" fill="white" />
      <line x1="8" y1="1" x2="8" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="11" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8" x2="5" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="8" x2="15" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.1" y1="3.1" x2="5.9" y2="5.9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="10.1" y1="10.1" x2="12.9" y2="12.9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="12.9" y1="3.1" x2="10.1" y2="5.9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="5.9" y1="10.1" x2="3.1" y2="12.9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}