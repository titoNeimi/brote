import type { JSX } from "react";
import { hash, iso } from "./iso";

/* Caminos (se dibujan sobre el pasto) y estilos de valla. */

/** Punto dentro de la baldosa: u avanza sobre gx, v sobre gy (0..1). */
function pt(gx: number, gy: number, u: number, v: number): string {
  const p = iso(gx + u, gy + v);
  return `${p.x},${p.y}`;
}

function quad(gx: number, gy: number, u0: number, v0: number, u1: number, v1: number): string {
  return [pt(gx, gy, u0, v0), pt(gx, gy, u1, v0), pt(gx, gy, u1, v1), pt(gx, gy, u0, v1)].join(" ");
}

const full = (gx: number, gy: number) => quad(gx, gy, 0, 0, 1, 1);

const PATH_DRAW: Record<string, (gx: number, gy: number) => JSX.Element> = {
  dirt: (gx, gy) => (
    <g>
      <polygon points={full(gx, gy)} fill="#c8a67a" />
      {[0, 1, 2, 3].map((i) => {
        const u = 0.15 + hash(gx * 7 + i, gy) * 0.7, v = 0.15 + hash(gx, gy * 7 + i) * 0.7;
        const p = iso(gx + u, gy + v);
        return <ellipse key={i} cx={p.x} cy={p.y} rx={1.6} ry={0.8} fill="#a8865a" />;
      })}
    </g>
  ),
  gravel: (gx, gy) => (
    <g>
      <polygon points={full(gx, gy)} fill="#d6d0c3" />
      {Array.from({ length: 12 }, (_, i) => {
        const u = 0.08 + hash(gx * 13 + i, gy * 3) * 0.84, v = 0.08 + hash(gx * 3, gy * 13 + i) * 0.84;
        const p = iso(gx + u, gy + v);
        return <circle key={i} cx={p.x} cy={p.y} r={0.9} fill={i % 3 ? "#b3ab9b" : "#f0ece4"} />;
      })}
    </g>
  ),
  stepping: (gx, gy) => (
    <g>
      {[[0.3, 0.3], [0.7, 0.62], [0.28, 0.75]].map(([u, v], i) => {
        const p = iso(gx + u + (hash(gx, gy + i) - 0.5) * 0.08, gy + v);
        return (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y + 0.8} rx={8} ry={4} fill="#8f9393" />
            <ellipse cx={p.x} cy={p.y} rx={8} ry={4} fill="#bfc3c1" />
          </g>
        );
      })}
    </g>
  ),
  stone: (gx, gy) => (
    <g>
      <polygon points={full(gx, gy)} fill="#8f8c86" />
      {[0, 1].flatMap((i) => [0, 1].map((j) => (
        <polygon key={`${i}${j}`} points={quad(gx, gy, i / 2 + 0.04, j / 2 + 0.04, i / 2 + 0.46, j / 2 + 0.46)}
          fill={(i + j + Math.floor(hash(gx, gy) * 2)) % 2 ? "#c7c3ba" : "#b7b3aa"} />
      )))}
    </g>
  ),
  brick: (gx, gy) => (
    <g>
      <polygon points={full(gx, gy)} fill="#8f4a35" />
      {[0, 1, 2, 3].flatMap((row) => {
        const offset = row % 2 ? 0.25 : 0;
        return [-1, 0, 1, 2].map((col) => {
          const u0 = Math.max(0, col * 0.5 + offset + 0.02), u1 = Math.min(1, col * 0.5 + offset + 0.48);
          if (u1 <= u0) return null;
          return (
            <polygon key={`${row}${col}`} points={quad(gx, gy, u0, row / 4 + 0.03, u1, row / 4 + 0.22)}
              fill={(row + col) % 2 ? "#c0674a" : "#b45d42"} />
          );
        });
      })}
    </g>
  ),
  wood: (gx, gy) => (
    <g>
      <polygon points={full(gx, gy)} fill="#7d5532" />
      {[0, 1, 2, 3].map((i) => (
        <polygon key={i} points={quad(gx, gy, i / 4 + 0.02, 0, i / 4 + 0.23, 1)} fill={i % 2 ? "#c49360" : "#b98654"} />
      ))}
    </g>
  ),
};

export function PathTile({ gx, gy, kind }: { gx: number; gy: number; kind: string }) {
  return (PATH_DRAW[kind] ?? PATH_DRAW.dirt)(gx, gy);
}

/** Vista previa de un camino en una baldosa suelta (para la paleta de construcción). */
export function PathSwatch({ kind }: { kind: string }) {
  return (
    <svg viewBox="-34 -2 68 36" width={68} height={36}>
      <polygon points="0,0 32,16 0,32 -32,16" fill="#8ccf6a" />
      <PathTile gx={0} gy={0} kind={kind} />
    </svg>
  );
}

type P = { x: number; y: number };

/** Cara vertical a lo largo de un segmento (de a a b), de altura h. */
const wall = (a: P, b: P, h: number, lift = 0) =>
  `${a.x},${a.y - lift} ${b.x},${b.y - lift} ${b.x},${b.y - lift - h} ${a.x},${a.y - lift - h}`;

const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

const FENCE_DRAW: Record<string, (a: P, b: P) => JSX.Element> = {
  wood: (a, b) => (
    <g>
      <line x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} stroke="#a0703f" strokeWidth={1.6} />
      <line x1={a.x} y1={a.y - 9} x2={b.x} y2={b.y - 9} stroke="#b9854f" strokeWidth={1.6} />
      {[a, b].map((p, i) => <rect key={i} x={p.x - 1.5} y={p.y - 12} width={3} height={12} rx={0.8} fill="#8a5a33" />)}
    </g>
  ),
  white: (a, b) => (
    <g>
      <line x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} stroke="#e2ddd0" strokeWidth={1.6} />
      <line x1={a.x} y1={a.y - 9} x2={b.x} y2={b.y - 9} stroke="#e2ddd0" strokeWidth={1.6} />
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
        const p = lerp(a, b, t);
        return <path key={t} d={`M${p.x - 1.3} ${p.y} V${p.y - 11} L${p.x} ${p.y - 13.5} L${p.x + 1.3} ${p.y - 11} V${p.y} Z`}
          fill="#fbfaf5" stroke="#cfc9ba" strokeWidth={0.4} />;
      })}
    </g>
  ),
  bamboo: (a, b) => (
    <g>
      {[0, 0.17, 0.34, 0.5, 0.67, 0.84, 1].map((t, i) => {
        const p = lerp(a, b, t);
        const h = 12 + (i % 2) * 2;
        return (
          <g key={t}>
            <rect x={p.x - 1.2} y={p.y - h} width={2.4} height={h} rx={1} fill={i % 2 ? "#c9b26a" : "#d6c07a"} />
            <line x1={p.x - 1.2} x2={p.x + 1.2} y1={p.y - h / 2} y2={p.y - h / 2} stroke="#9c8645" strokeWidth={0.6} />
          </g>
        );
      })}
      <line x1={a.x} y1={a.y - 8} x2={b.x} y2={b.y - 8} stroke="#7d6232" strokeWidth={1.1} />
    </g>
  ),
  hedge: (a, b) => (
    <g>
      <polygon points={wall(a, b, 9)} fill="#3f7f34" />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const p = lerp(a, b, t);
        return <circle key={t} cx={p.x} cy={p.y - 9} r={4.2} fill="#4f9a42" />;
      })}
      {[0.12, 0.62].map((t) => {
        const p = lerp(a, b, t);
        return <circle key={t} cx={p.x} cy={p.y - 11} r={2} fill="#6dbf56" opacity={0.7} />;
      })}
    </g>
  ),
  stone: (a, b) => (
    <g>
      <polygon points={wall(a, b, 8)} fill="#a39e93" />
      <polygon points={wall(a, b, 2.5, 8)} fill="#c9c4b8" />
      <line x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} stroke="#8a857a" strokeWidth={0.6} />
      {[0.25, 0.75].map((t) => { const p = lerp(a, b, t); return <line key={t} x1={p.x} x2={p.x} y1={p.y - 8} y2={p.y - 4} stroke="#8a857a" strokeWidth={0.6} />; })}
      {[0, 0.5, 1].map((t) => { const p = lerp(a, b, t); return <line key={t} x1={p.x} x2={p.x} y1={p.y - 4} y2={p.y} stroke="#8a857a" strokeWidth={0.6} />; })}
    </g>
  ),
  iron: (a, b) => (
    <g stroke="#2f3437" strokeWidth={1}>
      <line x1={a.x} y1={a.y - 2} x2={b.x} y2={b.y - 2} />
      <line x1={a.x} y1={a.y - 10} x2={b.x} y2={b.y - 10} />
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
        const p = lerp(a, b, t);
        return (
          <g key={t}>
            <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 13} />
            <path d={`M${p.x - 1.2} ${p.y - 13} L${p.x} ${p.y - 15.5} L${p.x + 1.2} ${p.y - 13} Z`} fill="#2f3437" stroke="none" />
          </g>
        );
      })}
      {[a, b].map((p, i) => <rect key={i} x={p.x - 1.6} y={p.y - 15} width={3.2} height={15} fill="#3d4448" stroke="none" />)}
    </g>
  ),
};

export function FenceSegment({ from, to, style }: { from: [number, number]; to: [number, number]; style: string }) {
  return (FENCE_DRAW[style] ?? FENCE_DRAW.wood)(iso(...from), iso(...to));
}

/** Vista previa de un estilo de valla (una esquina). */
export function FenceSwatch({ style }: { style: string }) {
  return (
    <svg viewBox="-36 -22 72 44" width={72} height={44}>
      <polygon points="0,-8 32,8 0,24 -32,8" fill="#8ccf6a" />
      <g transform="translate(0 -8)">
        <FenceSegment from={[0, 0]} to={[0, 1]} style={style} />
        <FenceSegment from={[0, 0]} to={[1, 0]} style={style} />
      </g>
    </svg>
  );
}
