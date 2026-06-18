"use client";

import React from "react";
import { SignalIcon } from "@heroicons/react/24/outline";
import type { PipelineFormData } from "@/types/pipeline";

interface Props {
  formData:    PipelineFormData;
  setFormData: React.Dispatch<React.SetStateAction<PipelineFormData>>;
}

const FIELDS = [
  {
    key:         "avg_degree_supplies"  as const,
    label:       "Supplies",
    description: "Grado medio aristas SUPPLIES (empresa→empresa)",
    accent:      "border-blue-200 bg-blue-50/50",
    dot:         "bg-blue-500",
  },
  {
    key:         "avg_degree_documents" as const,
    label:       "Documents",
    description: "Grado medio aristas de documento por empresa",
    accent:      "border-violet-200 bg-violet-50/50",
    dot:         "bg-violet-500",
  },
  {
    key:         "avg_degree_products"  as const,
    label:       "Products",
    description: "Grado medio aristas SELLS (empresa→producto)",
    accent:      "border-emerald-200 bg-emerald-50/50",
    dot:         "bg-emerald-500",
  },
] as const;

export default function ConnectivitySection({ formData, setFormData }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">

      {/* Card header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
          <SignalIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-gray-900 font-semibold text-base">Conectividad Media</p>
          <p className="text-gray-400 text-xs">Parámetros de relación por tipo de arista</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FIELDS.map(({ key, label, description, accent, dot }) => (
          <div
            key={key}
            className={`p-5 rounded-xl border ${accent} hover:border-opacity-80 transition-colors`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <p className="text-gray-700 text-xs font-bold uppercase tracking-widest">{label}</p>
            </div>
            <input
              type="number"
              min={1}
              value={formData[key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFormData({ ...formData, [key]: Number.isNaN(v) ? 1 : Math.max(1, v) });
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 font-mono text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent tabular-nums shadow-sm"
            />
            <p className="text-gray-400 text-[10px] mt-2 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}