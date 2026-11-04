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

const DRAW: Record<string, () => JSX.Element> = {
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
