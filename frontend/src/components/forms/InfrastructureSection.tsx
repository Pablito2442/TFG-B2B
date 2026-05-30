// components/forms/InfrastructureSection.tsx
"use client";

import React from "react";
import { Card, Title, Text, Button, NumberInput } from "@tremor/react";
import { CircleStackIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { PipelineFormData, StatusState } from "@/types/pipeline";

interface Props {
  formData: PipelineFormData;
  setFormData: React.Dispatch<React.SetStateAction<PipelineFormData>>;
  loading: boolean;
  status: StatusState;
  runPipeline: () => void;
}

export default function InfrastructureSection({ formData, setFormData, loading, status, runPipeline }: Props) {
  return (
    <div className="lg:col-span-1 h-full">
      <Card className="bg-gradient-to-b from-[#161B22] to-[#0B0E14] border-slate-800 shadow-2xl h-full flex flex-col relative overflow-hidden">
        {/* background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-dim)] blur-[100px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-2.5 bg-[var(--primary-dim)] rounded-xl border border-[oklch(0.60_0.128_158/0.20)]">
            <CircleStackIcon className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <Title className="text-white text-xl tracking-wide font-semibold italic">Infraestructura</Title>
        </div>

        <div className="space-y-5 flex-grow relative z-10">
          {/* ITEM 1: Purgar Grafo */}
          <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:border-[oklch(0.60_0.128_158/0.30)] transition-all flex justify-between items-center group">
            <div className="space-y-1">
              <Text className="text-slate-200 font-bold text-xs uppercase tracking-widest">Purgar Grafo</Text>
              <Text className="text-slate-500 text-[10px] uppercase font-semibold">Limpiar DB</Text>
            </div>
            <button
              type="button"
              onClick={() => setFormData({...formData, clear_db: !formData.clear_db})}
              className={`${
                formData.clear_db ? 'bg-[var(--primary)]' : 'bg-slate-700'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out shadow-inner focus:outline-none`}
            >
              <span className={`${
                  formData.clear_db ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out`}
              />
            </button>
          </div>

          {/* ITEM 2: Semilla Fija */}
          <div className="p-4 lg:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60 hover:border-[oklch(0.60_0.128_158/0.30)] transition-all flex justify-between items-center group">
            <div className="space-y-1">
              <Text className="text-slate-200 font-bold text-xs uppercase tracking-widest">Semilla Fija</Text>
              <Text className="text-slate-500 text-[10px] uppercase font-semibold">Reproducibilidad</Text>
            </div>
            <button
              type="button"
              onClick={() => setFormData({...formData, use_random_seed: !formData.use_random_seed})}
              className={`${
                formData.use_random_seed ? 'bg-[var(--primary)]' : 'bg-slate-700'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out shadow-inner focus:outline-none`}
            >
              <span className={`${
                  formData.use_random_seed ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out`}
              />
            </button>
          </div>

          {/* ITEM 3: Batch Size */}
          <div className="p-4 lg:p-5 rounded-2xl bg-[#0B0E14]/80 border border-slate-800/60 hover:border-slate-600 transition-colors">
            <Text className="text-slate-300 font-bold text-xs uppercase tracking-widest mb-3">Batch Size</Text>
            <NumberInput
              min={1}
              enableStepper={true}
              value={formData.batch_size}
              onValueChange={(v) => {
                let val = Number(v);
                if (Number.isNaN(val) || v === undefined) {
                  setFormData({...formData, batch_size: 1});
                } else {
                  setFormData({...formData, batch_size: Math.max(1, val)});
                }
              }}
              className="font-mono text-white bg-slate-950/80 border-slate-800 rounded-xl focus:border-[oklch(0.60_0.128_158/0.50)] [&_input::-webkit-outer-spin-button]:appearance-none [&_input::-webkit-inner-spin-button]:appearance-none [&_input]:[-moz-appearance:textfield]"
            />
          </div>
        </div>

        {/* BOTÓN Y STATUS */}
        <div className="mt-8 relative z-10">
          <Button
            size="xl"
            className="w-full py-5 bg-[var(--primary)] hover:brightness-110 border-none shadow-[var(--shadow-glow-primary)] hover:shadow-[0_0_30px_oklch(0.60_0.128_158/0.45)] transition-all text-lg font-bold tracking-wide rounded-xl group text-white"
            loading={loading}
            onClick={runPipeline}
            icon={RocketLaunchIcon}
          >
            <span className="group-hover:translate-x-1 transition-transform">EJECUTAR PIPELINE</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
