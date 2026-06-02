"use client";

import { useState } from "react";
import { EyeIcon } from "@heroicons/react/24/outline";
import {
  Card,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
} from "@tremor/react";
import type { ExactPathRow, ForwardRow, LineageRow } from "@/types/analytics";
import { EMPTY, EUR, SIGN, DocChain, ForwardRowItem, ShowMoreButton, SectionModal } from "./shared";
import { ChainDiagramButton } from "./ChainDiagram";

const PAGE = 10;
type ModalSection = "exactPaths" | "forward" | "lineage";

interface Props {
  exactPaths: ExactPathRow[];
  forward:    ForwardRow[];
  lineage:    LineageRow[];
}

// ── Table renderers ───────────────────────────────────────────────────────────

function ExactPathsTable({ rows }: { rows: ExactPathRow[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell className="text-slate-400">Cadena documental</TableHeaderCell>
          <TableHeaderCell className="text-slate-400">Proveedor</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Δ importe</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Saltos</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Visualizar</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const delta = (row.importe_factura ?? 0) - (row.importe_pedido ?? 0);
          return (
            <TableRow key={row.factura_id}>
              <TableCell><DocChain chain={row.cadena_completa ?? []} /></TableCell>
              <TableCell className="text-slate-300 text-sm">{row.proveedor}</TableCell>
              <TableCell className={`text-right font-mono text-sm ${delta > 0 ? "text-red-400" : delta < 0 ? "text-amber-400" : "text-slate-400"}`}>
                {SIGN(delta)}{EUR(delta, 2)} €
              </TableCell>
              <TableCell className="text-slate-400 text-right">{row.saltos_topologicos}</TableCell>
              <TableCell className="text-right">
                <ChainDiagramButton row={row} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function LineageTable({ rows }: { rows: LineageRow[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell className="text-slate-400">Factura</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Riesgo (€)</TableHeaderCell>
          <TableHeaderCell className="text-slate-400">Proveedor</TableHeaderCell>
          <TableHeaderCell className="text-slate-400">Afectado</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Saltos</TableHeaderCell>
          <TableHeaderCell className="text-slate-400 text-right">Productos</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.factura_id}>
            <TableCell className="text-white font-mono text-xs">{row.factura_id}</TableCell>
            <TableCell className="text-red-400 text-right font-mono font-semibold">{EUR(row.riesgo_economico, 2)} €</TableCell>
            <TableCell className="text-slate-300">{row.proveedor}</TableCell>
            <TableCell className="text-slate-300">{row.afectado}</TableCell>
            <TableCell className="text-slate-400 text-right">{row.saltos_topologicos}</TableCell>
            <TableCell className="text-slate-400 text-right">{row.id_productos_implicados?.length ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TraceabilityTab({ exactPaths, forward, lineage }: Props) {
  const [modal, setModal] = useState<ModalSection | null>(null);

  return (
    <div className="space-y-8">

      {/* Cadenas Documentales Exactas */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Cadenas Documentales Exactas</h2>
        <p className="text-slate-400 text-sm mb-4">
          Ruta shortest-path desde factura discrepante hasta el pedido origen. Pulsa <EyeIcon className="w-3.5 h-3.5 inline mb-0.5" /> para ver el diagrama de nodos.
        </p>
        {exactPaths.length === 0 ? EMPTY : (
          <Card className="bg-[#1E212B] border-slate-800">
            <div className="overflow-auto">
              <ExactPathsTable rows={exactPaths.slice(0, PAGE)} />
            </div>
            {exactPaths.length > PAGE && (
              <ShowMoreButton total={exactPaths.length} onClick={() => setModal("exactPaths")} />
            )}
          </Card>
        )}
      </section>

      {/* Trazabilidad Directa */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Trazabilidad Directa (Pedido → Documentos)</h2>
        <p className="text-slate-400 text-sm mb-4">Pedidos ordenados por conflictividad. Expande para ver los documentos que lo cumplen.</p>
        {forward.length === 0 ? EMPTY : (
          <div>
            <div className="space-y-2">
              {forward.slice(0, PAGE).map((row) => (
                <ForwardRowItem key={row.pedido_id} row={row} />
              ))}
            </div>
            {forward.length > PAGE && (
              <ShowMoreButton total={forward.length} onClick={() => setModal("forward")} />
            )}
          </div>
        )}
      </section>

      {/* Trazabilidad Inversa */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Trazabilidad Inversa (Factura → Pedido)</h2>
        <p className="text-slate-400 text-sm mb-4">
          Top-{Math.min(lineage.length, PAGE)} facturas discrepantes trazadas hasta su pedido original, por riesgo económico.
        </p>
        {lineage.length === 0 ? EMPTY : (
          <Card className="bg-[#1E212B] border-slate-800">
            <div className="overflow-auto">
              <LineageTable rows={lineage.slice(0, PAGE)} />
            </div>
            {lineage.length > PAGE && (
              <ShowMoreButton total={lineage.length} onClick={() => setModal("lineage")} />
            )}
          </Card>
        )}
      </section>

      {/* Section modals */}
      <SectionModal title="Cadenas Documentales Exactas — completo" open={modal === "exactPaths"} onClose={() => setModal(null)}>
        <ExactPathsTable rows={exactPaths} />
      </SectionModal>

      <SectionModal title="Trazabilidad Directa — completo" open={modal === "forward"} onClose={() => setModal(null)}>
        <div className="space-y-2">
          {forward.map((row) => <ForwardRowItem key={row.pedido_id} row={row} />)}
        </div>
      </SectionModal>

      <SectionModal title="Trazabilidad Inversa — completo" open={modal === "lineage"} onClose={() => setModal(null)}>
        <LineageTable rows={lineage} />
      </SectionModal>

    </div>
  );
}
