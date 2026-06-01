// app/pipeline/page.tsx
"use client";

import { toast } from 'sonner';
import React, { useState, useEffect } from "react";
import { Title, Text, Flex } from "@tremor/react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { API_BASE } from "@/lib/api";

// Importación de componentes
import TopologySection from "@/components/pipeline/TopologySection";
import InfrastructureSection from "@/components/pipeline/InfrastructureSection";
import ConnectivitySection from "@/components/pipeline/ConnectivitySection";
import { PipelineFormData, StatusState } from "@/types/pipeline";

export default function PipelinePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusState>({ type: null, msg: "" });
  
  // El estado y la lógica se quedan aquí porque la página los necesita para autorizar el pipeline
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const pollRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = React.useCallback((errorCount = 0) => {
      const tick = async () => {
        try {
          const s = await fetch(`${API_BASE}/api/pipeline/status`).then((r) => r.json());
          
          if (s.status === "success") {
            stopPolling();
            setLoading(false);
            toast.success("¡Pipeline completado con éxito!");
            return;
          }
          if (s.status === "error") {
            stopPolling();
            setLoading(false);
            toast.error(`Error en el pipeline: ${s.message}`);
            return;
          }
          
          pollRef.current = setTimeout(() => startPolling(0), 5000);

        } catch (err) {
          const newErrorCount = errorCount + 1;
          
          if (newErrorCount >= 5) {
            stopPolling();
            setLoading(false);
            toast.error("Se ha perdido la conexión con el servidor. El pipeline podría seguir ejecutándose en segundo plano.");
          } else {
            pollRef.current = setTimeout(() => startPolling(newErrorCount), 5000);
          }
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
    seed_value: 42
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

      if (response.status === 409) {
        toast.error("El pipeline ya está en ejecución. Espera a que termine.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error del servidor (${response.status})`);
      }

      // 202 Accepted — poll until done
      toast.info("Pipeline iniciado. Esto puede tardar varios minutos...");
      startPolling();

    } catch (error: any) {
      console.error("Error técnico del pipeline:", error);
      setLoading(false);
      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-bold">Error de conexión</span>
          <span className="text-slate-400 text-xs">
            {error?.message ?? "No se pudo contactar con el servidor. ¿Está el backend iniciado?"}
          </span>
        </div>
      );
    }
  };

  return (
    <main className="p-8 bg-[#0B0E14] min-h-screen">
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="text-white text-4xl font-bold tracking-tight flex items-center gap-3">
              <span className="p-2 bg-[var(--primary-dim)] rounded-xl border border-[oklch(0.60_0.128_158/0.22)] inline-flex">
                <AdjustmentsHorizontalIcon className="w-8 h-8 text-[var(--primary)]" />
              </span>
              Control de Pipeline
            </Title>
            <Text className="text-slate-400 mt-2">Configuración del modelo sintético y orquestación Neo4j</Text>
          </div>
        </Flex>
      </div>

      {/* GRID PRINCIPAL CON LOS 3 COMPONENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <TopologySection formData={formData} setFormData={setFormData} />
        <InfrastructureSection 
          formData={formData} 
          setFormData={setFormData} 
          loading={loading} 
          status={status} 
          runPipeline={runPipeline} 
        />
        <ConnectivitySection formData={formData} setFormData={setFormData} />
      </div>
    </main>
  );
}