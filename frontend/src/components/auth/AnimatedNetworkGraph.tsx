"use client";

import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

interface GNode { id: string; coordinates: [number, number]; r: number}
interface GEdge { a: string; b: string }
interface GRouteDef { a: string; b: string; dur: string; begin: string }

const RAW_NODES: GNode[] = [
  { id: "mad", coordinates: [-3.7038, 40.4168], r: 5 },
  { id: "bcn", coordinates: [2.1734, 41.3851],  r: 5 },
  { id: "vlc", coordinates: [-0.3763, 39.4699], r: 4 },
  { id: "svq", coordinates: [-5.9845, 37.3891], r: 5 },
  { id: "bil", coordinates: [-2.9350, 43.2630], r: 4 },
  { id: "zgz", coordinates: [-0.8877, 41.6497], r: 4 },
  { id: "vll", coordinates: [-4.7245, 41.6523], r: 3 },
  { id: "mlg", coordinates: [-4.4200, 36.7213], r: 3 },
  { id: "mur", coordinates: [-1.1307, 37.9922], r: 3 },
  { id: "cor", coordinates: [-8.4115, 43.3623], r: 3 },
  { id: "pmp", coordinates: [-1.6432, 42.8125], r: 3 },
  { id: "alb", coordinates: [-1.8550, 38.9943], r: 3 },
  { id: "sal", coordinates: [-5.6635, 40.9701], r: 3 },
  { id: "tol", coordinates: [-4.0273, 39.8628], r: 3 },
  { id: "cad", coordinates: [-6.2886, 36.5271], r: 4 },
];

const EDGES: GEdge[] = [
  { a:"mad", b:"bcn" }, { a:"mad", b:"vlc" }, { a:"mad", b:"svq" }, { a:"mad", b:"bil" },
  { a:"mad", b:"vll" }, { a:"mad", b:"zgz" }, { a:"bil", b:"pmp" }, { a:"pmp", b:"zgz" },
  { a:"zgz", b:"bcn" }, { a:"zgz", b:"vlc" }, { a:"bcn", b:"vlc" }, { a:"vlc", b:"mur" },
  { a:"mur", b:"mlg" }, { a:"svq", b:"mlg" }, { a:"svq", b:"cad" }, { a:"svq", b:"sal" },
  { a:"vll", b:"sal" }, { a:"cor", b:"bil" }, { a:"cor", b:"vll" }, { a:"mad", b:"tol" },
  { a:"tol", b:"alb" }, { a:"alb", b:"mur" }, { a:"tol", b:"svq" },
];

const ROUTES_DEF: GRouteDef[] = [
  { a: "bil", b: "mad", dur: "3.2s", begin: "0s"    },
  { a: "mad", b: "bcn", dur: "3.8s", begin: "0.6s"  },
  { a: "zgz", b: "vlc", dur: "2.9s", begin: "1.2s"  },
  { a: "mad", b: "svq", dur: "4.2s", begin: "0.3s"  },
  { a: "svq", b: "mlg", dur: "2.6s", begin: "1.8s"  },
  { a: "vlc", b: "mur", dur: "2.4s", begin: "0.9s"  },
  { a: "bcn", b: "vlc", dur: "3.0s", begin: "2.1s"  },
  { a: "mad", b: "vll", dur: "3.5s", begin: "1.5s"  },
];

export default function IntegratedAnimatedNetworkMap() {
  return (
    <div className="h-[500px] w-full flex justify-center items-center relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-3, 40], scale: 2800 }}
        width={600}
        height={500}
        style={{ width: "70%", height: "70%" }}
      >
        <defs>
          <marker id="arr-dim" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0.5 L4,2.5 L0,4.5" stroke="#4b6cb7" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="arr-active" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0.5 L4,2.5 L0,4.5" stroke="#818cf8" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </marker>
        </defs>

        <Geographies geography="/spain.json">
          {({ geographies, projection }) => {
            const projectedNodes = RAW_NODES.map(n => {
              const [x, y] = projection(n.coordinates) || [0, 0];
              return { ...n, x, y };
            });
            const nodeMap = Object.fromEntries(projectedNodes.map(n => [n.id, n]));

            const getPath = (aId: string, bId: string) => {
              const na = nodeMap[aId];
              const nb = nodeMap[bId];
              if (!na || !nb) return "";
              const mx = (na.x + nb.x) / 2 + (nb.y - na.y) * 0.08;
              const my = (na.y + nb.y) / 2 - (nb.x - na.x) * 0.08;
              return `M${na.x},${na.y} Q${mx},${my} ${nb.x},${nb.y}`;
            };

            return (
              <>
                {/* Background map — dark navy contrasts against gray-900 panel */}
                {geographies.map((geo: any) => (
                  <Geography
                    key={geo.rsmKey || geo.properties?.cartodb_id || Math.random()}
                    geography={geo}
                    fill="#1a2744"
                    stroke="#2d4a7a"
                    strokeWidth={0.7}
                    style={{
                      default: { outline: "none" },
                      hover:   { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))}

                {/* Static edges */}
                {EDGES.map((e, i) => {
                  const p = getPath(e.a, e.b);
                  if (!p) return null;
                  return (
                    <path key={`edge-${i}`} d={p} stroke="#4b6cb7" strokeWidth="1.2"
                      opacity={0.5} fill="none" markerEnd="url(#arr-dim)" />
                  );
                })}

                {/* Active route glow lines */}
                {ROUTES_DEF.map((r, i) => {
                  const p = getPath(r.a, r.b);
                  if (!p) return null;
                  return (
                    <path key={`route-line-${i}`} d={p} stroke="#818cf8" strokeWidth="2"
                      opacity="0.45" fill="none" markerEnd="url(#arr-active)" />
                  );
                })}

                {/* Animating data packets — start opacity 0 to avoid (0,0) dot before begin */}
                {ROUTES_DEF.map((r, i) => {
                  const p = getPath(r.a, r.b);
                  if (!p) return null;
                  return (
                    <circle key={`packet-1-${i}`} r="3" fill="#818cf8" opacity="0">
                      <animate attributeName="opacity" from="0" to="1" dur="0.001s" begin={r.begin} fill="freeze" />
                      <animateMotion dur={r.dur} repeatCount="indefinite" begin={r.begin} path={p} />
                    </circle>
                  );
                })}

                {ROUTES_DEF.slice(0, 4).map((r, i) => {
                  const p = getPath(r.a, r.b);
                  if (!p) return null;
                  const offsetTime = parseFloat(r.begin) + (parseFloat(r.dur) / 2);
                  return (
                    <circle key={`packet-2-${i}`} r="2" fill="#a78bfa" opacity="0">
                      <animate attributeName="opacity" from="0" to="0.70" dur="0.001s" begin={`${offsetTime}s`} fill="freeze" />
                      <animateMotion dur={r.dur} repeatCount="indefinite" begin={`${offsetTime}s`} path={p} />
                    </circle>
                  );
                })}

                {/* Nodes */}
                {projectedNodes.map((n) => (
                  <g key={n.id}>
                    <circle cx={n.x} cy={n.y} r={n.r + 8} fill="rgba(129,140,248,0.12)" />
                    <circle cx={n.x} cy={n.y} r={n.r + 3} fill="rgba(129,140,248,0.06)" />
                    <circle cx={n.x} cy={n.y} r={n.r} fill="#818cf8" stroke="rgba(167,139,250,0.60)" strokeWidth="1.5" />
                    <circle cx={n.x} cy={n.y} r={n.r * 0.35} fill="rgba(30,27,75,0.8)" />
                  </g>
                ))}
              </>
            );
          }}
        </Geographies>
      </ComposableMap>
    </div>
  );
}