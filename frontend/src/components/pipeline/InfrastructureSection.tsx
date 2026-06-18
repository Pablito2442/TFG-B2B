"use client";

import React from "react";
import { CircleStackIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import type { PipelineFormData, StatusState } from "@/types/pipeline";

interface Props {
  formData:    PipelineFormData;
  setFormData: React.Dispatch<React.SetStateAction<PipelineFormData>>;
  loading:     boolean;
  status:      StatusState;
  runPipeline: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function InfrastructureSection({ formData, setFormData, loading, runPipeline }: Props) {
  return (
    <div className="lg:col-span-1">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 h-full flex flex-col">

        {/* Card header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <CircleStackIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-base">Infraestructura</p>
            <p className="text-gray-400 text-xs">Neo4j y semilla de datos</p>
          </div>
        </div>

        <div className="space-y-3 flex-grow">

          {/* Toggle: Purgar Grafo */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors">
            <div>
              <p className="text-gray-800 text-sm font-semibold">Purgar Grafo</p>
              <p className="text-gray-400 text-xs mt-0.5">Limpiar DB antes de cargar</p>
            </div>
            <Toggle
              checked={formData.clear_db}
              onChange={() => setFormData({ ...formData, clear_db: !formData.clear_db })}
            />
          </div>

          {/* Toggle: Semilla Fija */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors">
            <div>
              <p className="text-gray-800 text-sm font-semibold">Semilla Aleatoria</p>
              <p className="text-gray-400 text-xs mt-0.5">Reproducibilidad controlada</p>
            </div>
            <Toggle
              checked={formData.use_random_seed}
              onChange={() => setFormData({ ...formData, use_random_seed: !formData.use_random_seed })}
            />
          </div>

          {/* Batch Size */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors">
            <p className="text-gray-700 text-xs font-semibold uppercase tracking-wider mb-2">Batch Size</p>
            <input
              type="number"
              min={1}
              value={formData.batch_size}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFormData({ ...formData, batch_size: Number.isNaN(v) ? 1 : Math.max(1, v) });
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent tabular-nums"
            />
          </div>
        </div>

        {/* Run button */}
        <div className="mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={runPipeline}
            className="w-full py-4 flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm tracking-wide transition-colors shadow-sm active:scale-[0.99]"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <RocketLaunchIcon className="w-4 h-4 shrink-0" />
            )}
            {loading ? "EJECUTANDO…" : "EJECUTAR PIPELINE"}
          </button>
        </div>
      </div>
    </div>
  );
}