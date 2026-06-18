"use client";

import { useState } from "react";
import { BuildingOffice2Icon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import SectionHeader from "@/components/ui/SectionHeader";
import SimpleBarList from "@/components/dashboard/SimpleBarList";
import RingChart     from "@/components/charts/RingChart";
import RankingModal  from "@/components/dashboard/RankingModal";
import type { ModalData } from "@/components/dashboard/RankingModal";

const DOC_TYPE_HEX: Record<string, string> = {
  INVOICE: "#26b5a0",
  ORDER:   "#60a5fa",
  DESADV:  "#a78bfa",
};
const FALLBACK_HEX = "#6366f1";

interface RankingsGridProps {
  docTypes:  { name: string; value: number }[];
  suppliers: { name: string; value: number }[];
  buyers:    { name: string; value: number }[];
}

interface RankingCardProps {
  config: Omit<ModalData, "data">;
  data: { name: string; value: number }[];
  delayMs: number;
  onShowAll: (modalPayload: ModalData) => void;
}

function RankingCard({ config, data, delayMs, onShowAll }: RankingCardProps) {
  return (
    <div 
      className="animate-fade-up bg-white border border-gray-200 rounded-xl shadow-sm p-6"
      style={{ animationDelay: `${delayMs}ms` }} // 2. Dynamic stagger
    >
      <SectionHeader
        icon={BuildingOffice2Icon}
        title={config.title}
        subtitle={config.subtitle}
        iconColor="text-gray-500"
        iconBg="bg-gray-100"
      />
      {data.length > 0 ? (
        <>
          <SimpleBarList data={data.slice(0, 5)} suffix={config.suffix} color={config.color as any} />
          {data.length > 5 && (
            <button
              // 3. Clean payload construction
              onClick={() => onShowAll({ ...config, data })}
              className="mt-4 w-full py-2 text-[11px] font-semibold rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-150"
            >
              Ver todos ({data.length}) →
            </button>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-sm py-10 text-center">Sin datos.</p>
      )}
    </div>
  );
}

export default function RankingsGrid({ docTypes, suppliers, buyers }: RankingsGridProps) {
  const [modal, setModal] = useState<ModalData | null>(null);

  const donutTotal    = docTypes.reduce((s, d) => s + d.value, 0);
  const donutSegments = docTypes.map((d) => ({
    name:  d.name,
    value: d.value,
    color: DOC_TYPE_HEX[d.name] ?? FALLBACK_HEX,
  }));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Doc types donut */}
        <div 
          className="animate-fade-up bg-white border border-gray-200 rounded-xl shadow-sm p-6"
          style={{ animationDelay: "100ms" }}
        >
          <SectionHeader
            icon={DocumentDuplicateIcon}
            title="Tipos de Documento"
            subtitle="Distribución por categoría EDI."
            iconColor="text-gray-500"
            iconBg="bg-gray-100"
          />
          {docTypes.length > 0 ? (
            <RingChart
              data={donutSegments}
              centerLabel={Intl.NumberFormat("es").format(donutTotal)}
              centerSub="documentos"
              formatHoverValue={(value, tot) =>
                `${Intl.NumberFormat("es").format(value)} docs · ${tot > 0 ? ((value / tot) * 100).toFixed(1) : "0"}%`
              }
            />
          ) : (
            <p className="text-gray-400 text-sm py-10 text-center">
              Sin datos — ejecuta el pipeline primero.
            </p>
          )}
        </div>

        <RankingCard
          config={{
            title: "Top Proveedores",
            subtitle: "Por número de clientes abastecidos.",
            suffix: "clientes",
            color: "primary"
          }}
          data={suppliers}
          delayMs={200}
          onShowAll={setModal}
        />

        <RankingCard
          config={{
            title: "Top Compradores",
            subtitle: "Por número de proveedores recibidos.",
            suffix: "proveedores",
            color: "violet"
          }}
          data={buyers}
          delayMs={300}
          onShowAll={setModal}
        />

      </div>

      <RankingModal modal={modal} onClose={() => setModal(null)} />
    </>
  );
}
