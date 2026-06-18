// app/pipeline/page.tsx
"use client";

import { toast } from 'sonner';
import React, { useState } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";

import TopologySection from "@/components/pipeline/TopologySection";
import InfrastructureSection from "@/components/pipeline/InfrastructureSection";
import ConnectivitySection from "@/components/pipeline/ConnectivitySection";
import { PipelineFormData, StatusState } from "@/types/pipeline";

export default function PipelinePage() {
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState<StatusState>({ type: null, msg: "" });
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) { clearTimeout(pollRef.current); pollRef.current = null; }
  };

  const startPolling = React.useCallback((errorCount = 0) => {
    const tick = async () => {
      try {
        const s = await fetch(`${API_BASE}/api/pipeline/status`).then((r) => r.json());
        if (s.status === "success") { stopPolling(); setLoading(false); toast.success("¡Pipeline completado con éxito!"); return; }
        if (s.status === "error")   { stopPolling(); setLoading(false); toast.error(`Error en el pipeline: ${s.message}`); return; }
        pollRef.current = setTimeout(() => startPolling(0), 5000);
      } catch {
        const n = errorCount + 1;
        if (n >= 5) { stopPolling(); setLoading(false); toast.error("Se ha perdido la conexión con el servidor."); }
        else { pollRef.current = setTimeout(() => startPolling(n), 5000); }
      }
    };
    tick();
  }, []);

  const [formData, setFormData] = useState<PipelineFormData>({
    rows: 200,
    avg_degree_supplies: 7,
    avg_degree_documents: 5,
    gamma: 2.4,
    beta: 1.8,
    mu: 0.30,
    min_comm: 6,
    max_comm: 45,
    avg_degree_products: 25,
    batch_size: 10000,
    clear_db: true,
    use_random_seed: true,
    seed_value: 42,
  });

  const runPipeline = async () => {
    if (dbStatus === "disconnected") {
      toast.error("No se puede ejecutar. La base de datos Neo4j no está conectada.");
      return;
    }
    setLoading(true);
    stopPolling();
    try {
      const finalData = { ...formData, rows: Math.max(2, Number(formData.rows) || 2) };
      const response = await fetch(`${API_BASE}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      if (response.status === 409) { toast.error("El pipeline ya está en ejecución."); setLoading(false); return; }
      if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.detail || `Error del servidor (${response.status})`); }
      toast.info("Pipeline iniciado. Esto puede tardar varios minutos...");
      startPolling();
    } catch (error: unknown) {
      setLoading(false);
      const msg = error instanceof Error ? error.message : "No se pudo contactar con el servidor.";
      toast.error(msg);
    }
  };

  return (
    <main className="p-8 bg-[var(--bg-base)] min-h-screen">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <AdjustmentsHorizontalIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-gray-900 text-2xl font-bold tracking-tight">Control de Pipeline</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configuración del modelo sintético y orquestación Neo4j</p>
          </div>
        </div>
      </div>

      {/* ── TOPOLOGY + INFRASTRUCTURE ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-6">
        <TopologySection formData={formData} setFormData={setFormData} />
        <InfrastructureSection
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          status={status}
          runPipeline={runPipeline}
        />
      </div>

      {/* ── CONNECTIVITY ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto">
        <ConnectivitySection formData={formData} setFormData={setFormData} />
      </div>
    </main>
  );
}