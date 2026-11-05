import type { JSX } from "react";
import { SPECIES_BY_ID } from "../core/rewards";

/*
 * Sprites procedurales. Origen en la base de la planta (0,0); y negativo hacia arriba.
 * Pensados para una baldosa isométrica de 64×32.
 */

const STEM = "#4f8a3c";
const LEAF = "#6db552";
const LEAF_DARK = "#4a8f3a";
const TRUNK = "#7a4f2e";
const TRUNK_DARK = "#5e3b21";

function Blob({ x, y, r, fill, light }: { x: number; y: number; r: number; fill: string; light: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.55} fill={light} opacity={0.55} />
    </g>
  );
}

function Stem({ h, x = 0, bend = 0 }: { h: number; x?: number; bend?: number }) {
  return (
    <path d={`M${x} 0 Q${x + bend} ${-h / 2} ${x} ${-h}`} stroke={STEM} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  );
}

function Leaf({ x, y, angle, size = 1, fill = LEAF }: { x: number; y: number; angle: number; size?: number; fill?: string }) {
  return <ellipse cx={x} cy={y} rx={5 * size} ry={2.2 * size} fill={fill} transform={`rotate(${angle} ${x} ${y})`} />;
}

function Daisy({ x, y, r = 4, petal = "#ffffff", center = "#f5c431" }: { x: number; y: number; r?: number; petal?: string; center?: string }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx={x} cy={y - r * 0.7} rx={r * 0.35} ry={r * 0.75} fill={petal} stroke="#e4e4e4" strokeWidth={0.3}
          transform={`rotate(${i * 45} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={r * 0.4} fill={center} />
    </g>
  );
}

function Trunk({ h, w = 5 }: { h: number; w?: number }) {
  return (
    <g>
      <path d={`M${-w / 2} 0 L${-w / 3} ${-h} L${w / 3} ${-h} L${w / 2} 0 Z`} fill={TRUNK} />
      <path d={`M${w / 6} 0 L${w / 8} ${-h} L${w / 3} ${-h} L${w / 2} 0 Z`} fill={TRUNK_DARK} />
    </g>
  );
}

/** Sombrero de hongo (media cúpula) con base en (x, y). */
function Cap({ x, y, r, fill, dot }: { x: number; y: number; r: number; fill: string; dot: string }) {
  return (
    <g>
      <path d={`M${x - r} ${y} Q${x - r} ${y - r * 1.3} ${x} ${y - r * 1.3} Q${x + r} ${y - r * 1.3} ${x + r} ${y} Z`} fill={fill} />
      <circle cx={x - r * 0.4} cy={y - r * 0.6} r={r * 0.18} fill={dot} />
      <circle cx={x + r * 0.35} cy={y - r * 0.85} r={r * 0.14} fill={dot} />
      <circle cx={x + r * 0.55} cy={y - r * 0.3} r={r * 0.12} fill={dot} />
    </g>
  );
}

function Pumpkin({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <rect x={x - 0.8} y={y - r * 1.55} width={1.6} height={r * 0.5} rx={0.6} fill="#4f6b2a" />
      <ellipse cx={x - r * 0.45} cy={y - r * 0.75} rx={r * 0.6} ry={r * 0.75} fill="#d06d1c" />
      <ellipse cx={x + r * 0.45} cy={y - r * 0.75} rx={r * 0.6} ry={r * 0.75} fill="#c4621a" />
      <ellipse cx={x} cy={y - r * 0.75} rx={r * 0.5} ry={r * 0.78} fill="#ea8a2c" />
      <ellipse cx={x - r * 0.15} cy={y - r * 1.05} rx={r * 0.18} ry={r * 0.3} fill="#f7b45e" opacity={0.6} />
    </g>
  );
}

function OrchidBloom({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - 2.2 * s} rx={1.5 * s} ry={2.4 * s} fill="#f1d3f7" stroke="#d7a6e6" strokeWidth={0.3}
          transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <ellipse cx={x} cy={y + 1.4 * s} rx={1.6 * s} ry={1.3 * s} fill="#a83fbf" />
      <circle cx={x} cy={y} r={0.8 * s} fill="#f7d44a" />
    </g>
  );
}

/** Fronda de palmera: hoja curva entre la copa y la punta. */
function Frond({ x0, y0, x1, y1, arch, w = 2.4 }: { x0: number; y0: number; x1: number; y1: number; arch: number; w?: number }) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 - arch;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = (-(y1 - y0) / len) * w;
  const ny = ((x1 - x0) / len) * w;
  return (
    <path d={`M${x0} ${y0} Q${mx + nx} ${my + ny} ${x1} ${y1} Q${mx - nx} ${my - ny} ${x0} ${y0} Z`} fill="#4a9a3c" stroke="#3a7f2f" strokeWidth={0.6} />
  );
}

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const k = r * 0.28;
  return (
    <path d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
      fill={fill} />
  );
}

const DRAW: Record<string, () => JSX.Element> = {
  mushroom: () => (
    <g>
      <path d="M-2.2 0 L-1.6 -7 L1.6 -7 L2.2 0 Z" fill="#f3e6cf" />
      <Cap x={0} y={-6} r={7} fill="#d9442e" dot="#ffffff" />
      <path d="M6.2 0 L6.5 -3.5 L8 -3.5 L8.3 0 Z" fill="#f3e6cf" />
      <Cap x={7.2} y={-3.2} r={3.6} fill="#e0703a" dot="#fff1e0" />
      <Leaf x={-6} y={-1} angle={-15} size={0.8} />
    </g>
  ),
  dandelion: () => (
    <g>
      <Stem h={16} x={2} bend={1} />
      <Stem h={9} x={-4} bend={-1} />
      <Leaf x={-4} y={-2} angle={-15} size={1.2} fill={LEAF_DARK} />
      <Leaf x={5} y={-2} angle={15} size={1.2} fill={LEAF_DARK} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <line key={i} x1={2} y1={-16} x2={2 + Math.cos(a) * 5.5} y2={-16 + Math.sin(a) * 5.5} stroke="#ffffff" strokeWidth={0.6} />;
      })}
      <circle cx={2} cy={-16} r={5.5} fill="#ffffff" opacity={0.55} />
      <circle cx={2} cy={-16} r={1.2} fill="#d8cfa8" />
      <Daisy x={-4} y={-9} r={3} petal="#f7c518" center="#e5a50a" />
    </g>
  ),
  glowshroom: () => (
    <g>
      <ellipse cx={0} cy={-8} rx={14} ry={10} fill="#8ff5e0" opacity={0.25} />
      <path d="M-4 0 Q-5 -5 -4 -9" stroke="#e6fff9" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M2 0 Q3 -7 2 -13" stroke="#e6fff9" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M7 0 L7.3 -5" stroke="#e6fff9" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Cap x={-4} y={-8.5} r={4.5} fill="#2fc7b4" dot="#c8fff4" />
      <Cap x={2} y={-12.5} r={5.5} fill="#3fd6c1" dot="#d8fffa" />
      <Cap x={7.3} y={-4.8} r={3} fill="#5ce0cf" dot="#e0fffb" />
    </g>
  ),
  poppy: () => (
    <g>
      <Leaf x={-3} y={-3} angle={-50} size={1.1} />
      <Leaf x={4} y={-4} angle={50} size={1.1} />
      {[
        [-6, 14],
        [5, 19],
        [0, 10],
      ].map(([x, h]) => (
        <g key={x}>
          <Stem h={h} x={x} />
          <circle cx={x} cy={-h} r={3.8} fill="#e0322a" />
          <circle cx={x - 0.9} cy={-h - 0.9} r={2.4} fill="#f2604c" opacity={0.7} />
          <circle cx={x} cy={-h} r={1.2} fill="#2b1b1b" />
        </g>
      ))}
    </g>
  ),
  succulent: () => (
    <g>
      {[-75, -50, -25, 0, 25, 50, 75].map((a) => (
        <g key={a} transform={`rotate(${a} 0 0)`}>
          <ellipse cx={0} cy={-7} rx={2.8} ry={7} fill="#6aa58c" />
          <circle cx={0} cy={-13.4} r={0.9} fill="#e58fa0" />
        </g>
      ))}
      {[-35, 0, 35].map((a) => (
        <ellipse key={a} cx={0} cy={-5} rx={2.4} ry={5} fill="#9fd1b8" transform={`rotate(${a} 0 0)`} />
      ))}
    </g>
  ),
  lotus: () => (
    <g>
      <ellipse cx={0} cy={-1} rx={14} ry={5.5} fill="#3f8f5a" />
      <ellipse cx={-1} cy={-2} rx={12} ry={4.2} fill="#56ab6c" />
      <path d="M0 -2 L11 -3" stroke="#3f8f5a" strokeWidth={0.8} />
      {[-62, -32, 32, 62].map((a) => (
        <ellipse key={a} cx={0} cy={-11} rx={3.2} ry={6.5} fill="#f29bbb" transform={`rotate(${a} 0 -4)`} />
      ))}
      {[-18, 18, 0].map((a) => (
        <ellipse key={a} cx={0} cy={-11} rx={3} ry={6} fill={a === 0 ? "#ffd6e5" : "#f7b6cd"} transform={`rotate(${a} 0 -4)`} />
      ))}
      <circle cx={0} cy={-7} r={1.8} fill="#f7d44a" />
    </g>
  ),
  fern: () => (
    <g>
      {[-55, -30, -10, 10, 30, 55].map((a, i) => {
        const L = 28 - Math.abs(a) / 5;
        const fill = i % 2 ? "#5aa846" : "#4c9a3c";
        return (
          <g key={a} transform={`rotate(${a} 0 0)`}>
            <path d={`M0 0 Q${a > 0 ? 3 : -3} ${-L / 2} 0 ${-L}`} stroke="#3f7f34" strokeWidth={1.2} fill="none" />
            {Array.from({ length: 6 }, (_, j) => {
              const y = -L * (0.25 + j * 0.13);
              const s = 1 - j * 0.13;
              return (
                <g key={j}>
                  <Leaf x={-2.6 * s} y={y} angle={30} size={0.6 * s} fill={fill} />
                  <Leaf x={2.6 * s} y={y} angle={-30} size={0.6 * s} fill={fill} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  ),
  cactus: () => (
    <g>
      <path d="M-4 -12 H-8 Q-11 -12 -11 -15 V-22" stroke="#4f9a5a" strokeWidth={5.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 -18 H7 Q10 -18 10 -21 V-27" stroke="#4f9a5a" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={-4.5} y={-32} width={9} height={32} rx={4.5} fill="#4f9a5a" />
      <rect x={-2.2} y={-30} width={1.6} height={28} rx={0.8} fill="#79c285" opacity={0.6} />
      <rect x={1.6} y={-30} width={1.2} height={28} rx={0.6} fill="#3d7f47" opacity={0.6} />
      {[[-5, -8], [5, -12], [-5, -22], [5, -26], [-12, -18], [11, -24]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x} ${y} l${x < 0 ? -1.5 : 1.5} -0.6`} stroke="#e9f2d0" strokeWidth={0.5} />
      ))}
      <Daisy x={0} y={-33} r={3.2} petal="#f28ab0" center="#f7d44a" />
    </g>
  ),
  orchid: () => (
    <g>
      <Leaf x={-6} y={-2} angle={-10} size={1.8} fill={LEAF_DARK} />
      <Leaf x={6} y={-3} angle={15} size={1.7} />
      <path d="M0 -2 Q-3 -26 11 -32" stroke={STEM} strokeWidth={1.4} fill="none" />
      <OrchidBloom x={-1} y={-17} s={1.1} />
      <OrchidBloom x={1} y={-25} s={1.2} />
      <OrchidBloom x={6.5} y={-30} s={1.1} />
      <OrchidBloom x={11.5} y={-31} s={0.9} />
    </g>
  ),
  pumpkin: () => (
    <g>
      <Blob x={-9} y={-9} r={8} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={9} y={-12} r={9} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={1} y={-18} r={8} fill="#4a9a40" light="#7ccf5e" />
      <path d="M-12 -18 q-3 -2 -1 -4 q2 -1 1 2" stroke={STEM} strokeWidth={0.8} fill="none" />
      <Pumpkin x={-6} y={0} r={8} />
      <Pumpkin x={9} y={1} r={6} />
    </g>
  ),
  bamboo: () => (
    <g>
      {[
        [-6, 36],
        [0, 46],
        [6, 32],
      ].map(([x, h]) => (
        <g key={x}>
          <rect x={x - 1.7} y={-h} width={3.4} height={h} rx={1} fill="#7cbf4a" />
          <rect x={x + 0.4} y={-h} width={1.1} height={h} fill="#629f37" />
          {Array.from({ length: Math.floor(h / 8) }, (_, j) => (
            <rect key={j} x={x - 2.1} y={-8 * (j + 1)} width={4.2} height={1} rx={0.4} fill="#4f8a2c" />
          ))}
          <Leaf x={x + 4.5} y={-h + 5} angle={-20} size={0.9} fill="#5aa846" />
          <Leaf x={x - 4.5} y={-h + 11} angle={20} size={0.9} fill="#4c9a3c" />
        </g>
      ))}
    </g>
  ),
  bonsai: () => (
    <g>
      <path d="M-2 0 Q-7 -10 2 -16 Q8 -21 3 -28" stroke={TRUNK} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M0 -14 Q-6 -17 -10 -21" stroke={TRUNK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M5 -20 Q9 -19 10 -17" stroke={TRUNK} strokeWidth={2} fill="none" strokeLinecap="round" />
      {[
        [-11, -23, 8, 4],
        [9, -19, 7, 3.5],
        [3, -31, 9, 4.5],
      ].map(([x, y, rx, ry]) => (
        <g key={`${x}${y}`}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#3f7f3a" />
          <ellipse cx={x - 1} cy={y - 1.4} rx={rx * 0.75} ry={ry * 0.6} fill="#6bb557" />
        </g>
      ))}
    </g>
  ),
  moonflower: () => (
    <g>
      <ellipse cx={0} cy={-18} rx={22} ry={18} fill="#c9d8ff" opacity={0.3} />
      <Blob x={-8} y={-9} r={9} fill="#2f5d5a" light="#4f8a7f" />
      <Blob x={8} y={-10} r={9} fill="#2f5d5a" light="#4f8a7f" />
      <Blob x={0} y={-17} r={10} fill="#356a64" light="#5a9a8c" />
      {[
        [-8, -13],
        [7, -15],
        [0, -23],
        [-1, -8],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={6} fill="#e6edff" opacity={0.35} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={x} cy={y - 2.2} rx={1.9} ry={2.6} fill="#f6f8ff" transform={`rotate(${a} ${x} ${y})`} />
          ))}
          <circle cx={x} cy={y} r={1.3} fill="#b8c8ff" />
        </g>
      ))}
      <path d="M13 -40 A4.5 4.5 0 1 0 17 -32 A5.5 5.5 0 0 1 13 -40 Z" fill="#fff4c2" />
    </g>
  ),
  birch: () => (
    <g>
      <path d="M-3 0 L-2.2 -42 L2.2 -42 L3 0 Z" fill="#eeeae0" />
      <path d="M1 0 L1 -42 L2.2 -42 L3 0 Z" fill="#d6d0c2" />
      {[[-2.5, -6], [0, -13], [-2, -21], [0.3, -29]].map(([x, y]) => (
        <rect key={y} x={x} y={y} width={2.6} height={0.9} rx={0.4} fill="#3a3a3a" />
      ))}
      <Blob x={-11} y={-44} r={11} fill="#8cbf3f" light="#c2e36b" />
      <Blob x={11} y={-46} r={11} fill="#8cbf3f" light="#c2e36b" />
      <Blob x={-2} y={-60} r={12} fill="#97c947" light="#cfe97a" />
      <Blob x={1} y={-47} r={10} fill="#9fd04e" light="#d6ee85" />
    </g>
  ),
  palm: () => (
    <g>
      <path d="M-3.2 0 Q-4 -30 3 -52 L7 -51 Q1 -30 3 0 Z" fill="#a0784a" />
      {[-8, -16, -24, -32, -40, -47].map((y, i) => (
        <path key={y} d={`M${-3.4 + i * 0.9} ${y} l${5.4 - i * 0.2} -1`} stroke="#7d5a33" strokeWidth={0.8} />
      ))}
      <Frond x0={5} y0={-52} x1={-22} y1={-42} arch={10} />
      <Frond x0={5} y0={-52} x1={-14} y1={-64} arch={6} />
      <Frond x0={5} y0={-52} x1={4} y1={-70} arch={2} w={2} />
      <Frond x0={5} y0={-52} x1={24} y1={-62} arch={6} />
      <Frond x0={5} y0={-52} x1={30} y1={-42} arch={10} />
      <Frond x0={5} y0={-52} x1={-6} y1={-38} arch={6} w={2} />
      <circle cx={3} cy={-50} r={2.2} fill="#6b4a2b" />
      <circle cx={7.5} cy={-49.5} r={2.2} fill="#5e3f22" />
      <circle cx={5} cy={-47} r={2.2} fill="#6b4a2b" />
    </g>
  ),
  maple: () => (
    <g>
      <Trunk h={26} w={7} />
      <Blob x={-13} y={-36} r={14} fill="#c0392b" light="#e8664a" />
      <Blob x={13} y={-36} r={14} fill="#c94a24" light="#f08a3c" />
      <Blob x={-6} y={-52} r={15} fill="#d9542b" light="#f59a45" />
      <Blob x={8} y={-50} r={14} fill="#c0392b" light="#ec7048" />
      <Blob x={0} y={-40} r={13} fill="#e0672e" light="#f7ad4f" />
      {[[-19, -4, "#d9542b"], [15, -2, "#e0672e"], [5, 3, "#c0392b"]].map(([x, y, c]) => (
        <ellipse key={`${x}${y}`} cx={x as number} cy={y as number} rx={1.8} ry={1.1} fill={c as string}
          transform={`rotate(30 ${x} ${y})`} />
      ))}
    </g>
  ),
  wisteria: () => (
    <g>
      <Trunk h={26} w={6} />
      <path d="M0 -22 L-11 -34 M1 -24 L11 -36" stroke={TRUNK} strokeWidth={2.4} strokeLinecap="round" />
      <Blob x={-13} y={-40} r={12} fill="#4a8f3a" light="#79bf5c" />
      <Blob x={13} y={-40} r={12} fill="#4a8f3a" light="#79bf5c" />
      <Blob x={0} y={-52} r={14} fill="#559c42" light="#86cb66" />
      {[
        [-20, -34, 14],
        [-12, -32, 18],
        [-4, -42, 16],
        [5, -40, 20],
        [13, -32, 16],
        [21, -35, 12],
      ].map(([x, y, len]) => (
        <g key={`${x}${y}`}>
          {Array.from({ length: Math.floor(len / 3) }, (_, j) => (
            <ellipse key={j} cx={x} cy={y + j * 3} rx={2.6 - j * 0.35} ry={1.8} fill={j % 2 ? "#a77fd9" : "#bb98e6"} />
          ))}
        </g>
      ))}
    </g>
  ),
  startree: () => (
    <g>
      <ellipse cx={0} cy={-42} rx={36} ry={32} fill="#8fa2ff" opacity={0.22} />
      <Trunk h={26} w={7} />
      <Blob x={-13} y={-36} r={14} fill="#2b2f6b" light="#4a54a8" />
      <Blob x={13} y={-36} r={14} fill="#2b2f6b" light="#4a54a8" />
      <Blob x={-6} y={-52} r={15} fill="#333a80" light="#5865c2" />
      <Blob x={8} y={-50} r={14} fill="#333a80" light="#5865c2" />
      <Blob x={0} y={-40} r={13} fill="#3a438f" light="#6370cc" />
      {[[-14, -40, 2.6], [10, -54, 3], [-4, -60, 2.2], [14, -36, 2], [0, -44, 3.2], [-10, -50, 1.8], [6, -32, 1.8]].map(([x, y, r]) => (
        <Star key={`${x}${y}`} x={x} y={y} r={r} fill="#fff6c9" />
      ))}
      {[[-24, -60], [24, -56], [2, -74]].map(([x, y]) => (
        <Star key={`${x}${y}`} x={x} y={y} r={3} fill="#e6ecff" />
      ))}
    </g>
  ),

  sprout: () => (
    <g>
      <Stem h={10} />
      <Leaf x={-4} y={-9} angle={-30} />
      <Leaf x={4} y={-11} angle={30} />
    </g>
  ),
  clover: () => (
    <g>
      <Stem h={9} />
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} 0 -12)`}>
          <circle cx={-1.8} cy={-15.5} r={2.6} fill="#3fa34d" />
          <circle cx={1.8} cy={-15.5} r={2.6} fill="#3fa34d" />
        </g>
      ))}
      <circle cx={0} cy={-12} r={1} fill="#c9f2a0" />
    </g>
  ),
  daisy: () => (
    <g>
      <Stem h={16} x={-6} bend={-2} />
      <Stem h={20} x={4} bend={2} />
      <Stem h={12} x={0} />
      <Leaf x={-3} y={-5} angle={-25} />
      <Leaf x={4} y={-6} angle={25} />
      <Daisy x={-6} y={-16} />
      <Daisy x={4} y={-20} />
      <Daisy x={0} y={-12} r={3.5} />
    </g>
  ),
  tulip: () => (
    <g>
      {[
        [-6, 15, "#e8465b"],
        [5, 19, "#f07aa0"],
        [0, 12, "#f6b93b"],
      ].map(([x, h, c]) => (
        <g key={String(x)}>
          <Stem h={h as number} x={x as number} />
          <path
            d={`M${(x as number) - 3.5} ${-(h as number) - 1} q0 6 3.5 6 q3.5 0 3.5 -6 l-1.7 2 l-1.8 -3 l-1.8 3 z`}
            fill={c as string}
          />
        </g>
      ))}
      <Leaf x={-3} y={-4} angle={-60} size={1.2} />
      <Leaf x={3} y={-4} angle={60} size={1.2} />
    </g>
  ),
  bluebell: () => (
    <g>
      <path d="M0 0 Q-2 -14 6 -20" stroke={STEM} strokeWidth={1.8} fill="none" />
      <path d="M0 0 Q2 -10 -6 -15" stroke={STEM} strokeWidth={1.6} fill="none" />
      {[
        [6, -18],
        [3, -14],
        [-6, -13],
        [-3, -9],
      ].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x - 2.5} ${y} q0 -4 2.5 -4 q2.5 0 2.5 4 l-1 -0.8 l-1.5 1 l-1.5 -1 z`} fill="#5b7ce6" />
      ))}
      <Leaf x={-3} y={-3} angle={-40} size={1.3} />
      <Leaf x={3} y={-3} angle={40} size={1.3} />
    </g>
  ),
  sunflower: () => (
    <g>
      <Stem h={34} />
      <Leaf x={-5} y={-12} angle={-25} size={1.5} />
      <Leaf x={5} y={-20} angle={25} size={1.5} />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-42} rx={2.2} ry={5} fill="#f7c518" transform={`rotate(${i * (360 / 14)} 0 -36)`} />
      ))}
      <circle cx={0} cy={-36} r={5} fill="#6b3f1d" />
      <circle cx={-1.5} cy={-37.5} r={1.8} fill="#8a5a2c" />
    </g>
  ),
  lavender: () => (
    <g>
      {[-7, -3.5, 0, 3.5, 7].map((x, i) => {
        const h = 20 + ((i * 7) % 9);
        const tilt = x * 0.6;
        return (
          <g key={x}>
            <path d={`M0 0 L${x + tilt} ${-h}`} stroke={STEM} strokeWidth={1.2} />
            {Array.from({ length: 5 }, (_, j) => (
              <ellipse key={j} cx={x + tilt * (1 - j * 0.05)} cy={-h + j * 2.6} rx={1.7} ry={2} fill={j % 2 ? "#9b7fd4" : "#b39ae6"} />
            ))}
          </g>
        );
      })}
      <Leaf x={-4} y={-3} angle={-50} />
      <Leaf x={4} y={-3} angle={50} />
    </g>
  ),
  rose: () => (
    <g>
      <Blob x={-6} y={-9} r={8} fill={LEAF_DARK} light={LEAF} />
      <Blob x={6} y={-10} r={8} fill={LEAF_DARK} light={LEAF} />
      <Blob x={0} y={-16} r={9} fill={LEAF_DARK} light={LEAF} />
      {[
        [-7, -11],
        [5, -14],
        [0, -21],
        [8, -6],
        [-2, -7],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={3} fill="#d62f4b" />
          <path d={`M${x - 1.5} ${y} a1.5 1.5 0 1 1 3 0`} stroke="#9e1830" strokeWidth={0.7} fill="none" />
        </g>
      ))}
    </g>
  ),
  bush: () => (
    <g>
      <Blob x={-9} y={-10} r={10} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={9} y={-10} r={10} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={0} y={-18} r={12} fill="#4a9a40" light="#7ccf5e" />
    </g>
  ),
  hydrangea: () => (
    <g>
      <Blob x={-9} y={-10} r={10} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={9} y={-10} r={10} fill="#3f8a3a" light="#6fbf55" />
      <Blob x={0} y={-18} r={11} fill="#4a9a40" light="#7ccf5e" />
      {[
        [-9, -14, "#8fa8f0"],
        [8, -15, "#c79be8"],
        [0, -24, "#9fb4f5"],
        [-2, -10, "#d6a6ee"],
      ].map(([x, y, c]) => (
        <g key={`${x}${y}`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={(x as number) + Math.cos((a * Math.PI) / 180) * 2.6} cy={(y as number) + Math.sin((a * Math.PI) / 180) * 2.6}
              r={2.2} fill={c as string} />
          ))}
          <circle cx={x as number} cy={y as number} r={2} fill="#ffffff" opacity={0.6} />
        </g>
      ))}
    </g>
  ),
  blueberry: () => (
    <g>
      <Blob x={-9} y={-10} r={10} fill="#2f7a46" light="#5bb06a" />
      <Blob x={9} y={-11} r={10} fill="#2f7a46" light="#5bb06a" />
      <Blob x={0} y={-19} r={11} fill="#36864d" light="#66bd73" />
      {[
        [-10, -8], [-5, -14], [4, -10], [10, -15], [1, -22], [-3, -26], [7, -21], [-12, -15], [12, -7],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r={1.9} fill="#2f3e9e" />
          <circle cx={x - 0.6} cy={y - 0.6} r={0.6} fill="#a7b4ff" />
        </g>
      ))}
    </g>
  ),
  crystal: () => (
    <g>
      <Stem h={10} />
      <ellipse cx={0} cy={-22} rx={16} ry={14} fill="#9ef0ff" opacity={0.25} />
      {[-50, -25, 0, 25, 50].map((a) => (
        <path key={a} d="M0 -10 L-4 -26 L0 -36 L4 -26 Z" fill="#7fe3f5" stroke="#d8fbff" strokeWidth={0.6} opacity={0.9}
          transform={`rotate(${a} 0 -10)`} />
      ))}
      <path d="M0 -10 L-2 -24 L0 -30 L2 -24 Z" fill="#ffffff" opacity={0.8} />
      <circle cx={0} cy={-12} r={2.5} fill="#e9fdff" />
    </g>
  ),
  oak: () => (
    <g>
      <Trunk h={26} w={7} />
      <Blob x={-13} y={-36} r={14} fill="#3b7d33" light="#5fae4a" />
      <Blob x={13} y={-36} r={14} fill="#3b7d33" light="#5fae4a" />
      <Blob x={-6} y={-52} r={15} fill="#468f3b" light="#6dbf56" />
      <Blob x={8} y={-50} r={14} fill="#468f3b" light="#6dbf56" />
      <Blob x={0} y={-40} r={13} fill="#4f9a42" light="#78c95f" />
    </g>
  ),
  pine: () => (
    <g>
      <Trunk h={14} w={6} />
      {[
        [0, 24, 18],
        [-14, 20, 15],
        [-27, 16, 13],
        [-38, 11, 11],
      ].map(([offset, halfW, h]) => (
        <g key={offset}>
          <path d={`M${-halfW} ${-12 + offset} L0 ${-12 + offset - h - 8} L${halfW} ${-12 + offset} Z`} fill="#2d6b3e" />
          <path d={`M0 ${-12 + offset} L0 ${-12 + offset - h - 8} L${halfW} ${-12 + offset} Z`} fill="#245a33" />
        </g>
      ))}
    </g>
  ),
  cherry: () => (
    <g>
      <Trunk h={24} w={6} />
      <path d="M0 -20 L-10 -32 M1 -22 L10 -34" stroke={TRUNK} strokeWidth={2.5} strokeLinecap="round" />
      <Blob x={-13} y={-36} r={13} fill="#f19cbb" light="#ffd1e1" />
      <Blob x={13} y={-36} r={13} fill="#f19cbb" light="#ffd1e1" />
      <Blob x={-5} y={-50} r={14} fill="#f4a9c4" light="#ffdbe8" />
      <Blob x={8} y={-48} r={13} fill="#f4a9c4" light="#ffdbe8" />
      <Blob x={0} y={-38} r={11} fill="#f7b6cd" light="#ffe4ee" />
      {[[-20, -6], [14, -3], [6, 4], [-8, 3]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.6} ry={1} fill="#f7b6cd" />
      ))}
    </g>
  ),
  golden: () => (
    <g>
      <ellipse cx={0} cy={-40} rx={34} ry={30} fill="#ffe27a" opacity={0.25} />
      <Trunk h={26} w={7} />
      <Blob x={-13} y={-36} r={14} fill="#e2a917" light="#ffe27a" />
      <Blob x={13} y={-36} r={14} fill="#e2a917" light="#ffe27a" />
      <Blob x={-6} y={-52} r={15} fill="#f0bd28" light="#fff09b" />
      <Blob x={8} y={-50} r={14} fill="#f0bd28" light="#fff09b" />
      <Blob x={0} y={-40} r={13} fill="#f7cb3a" light="#fff4b3" />
      {[[-18, -58], [20, -46], [2, -66], [-24, -34]].map(([x, y]) => (
        <path key={`${x}${y}`} d={`M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1} Z`}
          fill="#fffbe0" />
      ))}
    </g>
  ),
};

function Withered({ tier }: { tier: number }) {
  const h = 8 + tier * 7;
  return (
    <g>
      <path d={`M0 0 Q2 ${-h / 2} ${h / 3} ${-h}`} stroke="#8c7350" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <path d={`M0 0 Q-2 ${-h / 3} ${-h / 3} ${-h * 0.7}`} stroke="#8c7350" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <ellipse cx={h / 3} cy={-h + 2} rx={3} ry={1.6} fill="#a88b5c" transform={`rotate(40 ${h / 3} ${-h + 2})`} />
      <ellipse cx={-h / 3} cy={-h * 0.7 + 2} rx={2.6} ry={1.4} fill="#9b7f52" transform={`rotate(-50 ${-h / 3} ${-h * 0.7 + 2})`} />
      <ellipse cx={4} cy={-1} rx={2.4} ry={1} fill="#a88b5c" />
    </g>
  );
}

export interface PlantSpriteProps {
  speciesId: string;
  withered?: boolean;
  /** 0..1, escala de crecimiento. */
  growth?: number;
  sway?: boolean;
  swayDelay?: number;
}

export function PlantSprite({ speciesId, withered = false, growth = 1, sway = true, swayDelay = 0 }: PlantSpriteProps) {
  const species = SPECIES_BY_ID[speciesId];
  const body = withered ? <Withered tier={species?.tier ?? 0} /> : (DRAW[speciesId] ?? DRAW.sprout)();
  return (
    <g transform={`scale(${growth})`}>
      <g className={sway && !withered ? "sway" : undefined} style={{ animationDelay: `${swayDelay}s` }}>
        {body}
      </g>
    </g>
  );
}

/** Destellos para plantas raras y legendarias. */
export function Sparkles({ rarity, height }: { rarity: "rare" | "legendary"; height: number }) {
  const color = rarity === "legendary" ? "#ffe066" : "#bfe9ff";
  const pts = [[-12, -height * 0.7], [11, -height * 0.9], [2, -height - 6]];
  return (
    <g className="twinkle">
      {pts.map(([x, y], i) => (
        <path key={i} style={{ animationDelay: `${i * 0.6}s` }}
          d={`M${x} ${y - 3} L${x + 0.8} ${y - 0.8} L${x + 3} ${y} L${x + 0.8} ${y + 0.8} L${x} ${y + 3} L${x - 0.8} ${y + 0.8} L${x - 3} ${y} L${x - 0.8} ${y - 0.8} Z`}
          fill={color} />
      ))}
    </g>
  );
}

export const TIER_HEIGHT = [14, 24, 40, 32, 70];
