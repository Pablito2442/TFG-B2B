"use client";

import React from "react";
import Slider from "@mui/material/Slider";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import type { PipelineFormData } from "@/types/pipeline";

interface Props {
  formData:    PipelineFormData;
  setFormData: React.Dispatch<React.SetStateAction<PipelineFormData>>;
}

function sliderSx(color: string) {
  return {
    color,
    height: 5,
    "& .MuiSlider-thumb": {
      height: 16,
      width: 16,
      backgroundColor: "#fff",
      border: `2px solid ${color}`,
      "&:hover": { boxShadow: `0 0 0 6px ${color}22` },
    },
    "& .MuiSlider-rail": { color: "#e5e7eb", opacity: 1 },
    "& .MuiSlider-track": { color },
  };
}

function NumInput({ value, min = 1, onChange }: { value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        onChange(Number.isNaN(v) ? min : Math.max(min, v));
      }}
      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent tabular-nums"
    />
  );
}

const SLIDERS = [
  { key: "mu",    label: "Mixing Parameter (μ)", min: 0.1, max: 0.9, step: 0.01, color: "#14b8a6" },
  { key: "gamma", label: "Exponente Gamma (γ)",  min: 1.1, max: 4.0, step: 0.1,  color: "#ec4899" },
  { key: "beta",  label: "Exponente Beta (β)",   min: 1.1, max: 3.0, step: 0.1,  color: "#f97316" },
] as const;

export default function TopologySection({ formData, setFormData }: Props) {
  const rows = Number(formData.rows) || 2;

  return (
    <div className="lg:col-span-2">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 h-full">

        {/* Card header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-pink-50 rounded-lg border border-pink-100">
            <RocketLaunchIcon className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-base">Generador LFR</p>
            <p className="text-gray-400 text-xs">Topología de red Scale-Free</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── ESCALA DE RED ── */}
          <div className="lg:col-span-2">
            <div className="h-full flex flex-col gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5">

              {/* Big number + reset */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-widest mb-1">Nº de Compañías</p>
                  <p className="text-gray-900 text-4xl font-black tabular-nums leading-none">
                    {rows.toLocaleString("es-ES")}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">nodos</p>
                </div>
                <button
                  type="button"
                  title="Resetear a 200"
                  onClick={() => setFormData({ ...formData, rows: 200 })}
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors active:scale-90"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Manual input */}
              <div>
                <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Valor manual</p>
                <NumInput value={formData.rows} min={2} onChange={(v) => setFormData({ ...formData, rows: v })} />
              </div>

              {/* Quick adjust */}
              <div>
                <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Ajuste rápido</p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1.5">
                    {[10, 50, 100].map((v) => (
                      <button
                        type="button" key={`+${v}`}
                        onClick={() => setFormData({ ...formData, rows: rows + v })}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-mono font-semibold hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors active:scale-95"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {[10, 50, 100].map((v) => (
                      <button
                        type="button" key={`-${v}`}
                        onClick={() => setFormData({ ...formData, rows: Math.max(2, rows - v) })}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-mono font-semibold hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors active:scale-95"
                      >
                        -{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── LFR SLIDERS ── */}
          <div className="lg:col-span-3 space-y-4">
            {SLIDERS.map(({ key, label, min, max, step, color }) => (
              <div key={key} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-widest">{label}</p>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-white border border-gray-200 text-gray-700 tabular-nums">
                    {formData[key]}
                  </span>
                </div>
                <Slider
                  value={formData[key]}
                  min={min} max={max} step={step}
                  onChange={(_, v) => setFormData({ ...formData, [key]: v as number })}
                  sx={sliderSx(color)}
                />
              </div>
            ))}

            {/* Seed value input — shown when use_random_seed is OFF */}
            {!formData.use_random_seed && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-2">Valor de Semilla</p>
                <NumInput
                  value={formData.seed_value}
                  min={1}
                  onChange={(v) => setFormData({ ...formData, seed_value: v })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}