import type { JSX } from "react";

/* Sprites de decoraciones. Mismo sistema que PlantSprite: origen en el centro de la baldosa. */

const WOOD = "#a0703f";
const WOOD_DARK = "#7a4f2e";
const STONE = "#a9aeae";
const STONE_LIGHT = "#c8cdcd";
const STONE_DARK = "#8a9090";
const WATER = "#6cc4e8";
const WATER_LIGHT = "#a8e2f5";

const DRAW: Record<string, () => JSX.Element> = {
  mushrooms: () => (
    <g>
      {[[-7, 2, 1], [5, -1, 1.3], [0, 4, 0.8]].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x={-1.6} y={-7} width={3.2} height={7} rx={1.2} fill="#f3ead8" />
          <path d="M-6 -6 Q0 -14 6 -6 Z" fill="#d8443a" />
          <circle cx={-2.5} cy={-8} r={1} fill="#fff" />
          <circle cx={2} cy={-9.5} r={0.9} fill="#fff" />
          <circle cx={3.5} cy={-7} r={0.7} fill="#fff" />
        </g>
      ))}
    </g>
  ),
  bench: () => (
    <g>
      <rect x={-14} y={-9} width={2.5} height={9} fill={WOOD_DARK} />
      <rect x={11.5} y={-9} width={2.5} height={9} fill={WOOD_DARK} />
      <rect x={-16} y={-11} width={32} height={4} rx={1} fill={WOOD} />
      <rect x={-14} y={-21} width={2.5} height={10} fill={WOOD_DARK} />
      <rect x={11.5} y={-21} width={2.5} height={10} fill={WOOD_DARK} />
      <rect x={-16} y={-22} width={32} height={3} rx={1} fill={WOOD} />
      <rect x={-16} y={-17} width={32} height={3} rx={1} fill="#b9854f" />
    </g>
  ),
  lamp: () => (
    <g>
      <circle cx={0} cy={-34} r={14} fill="#ffe7a0" opacity={0.25} className="glow" />
      <rect x={-1.5} y={-30} width={3} height={30} fill="#3d4448" />
      <rect x={-4} y={-2} width={8} height={2} fill="#3d4448" />
      <path d="M-5 -30 L5 -30 L4 -39 L-4 -39 Z" fill="#ffd66b" stroke="#3d4448" strokeWidth={1.2} />
      <path d="M-6 -39 L0 -44 L6 -39 Z" fill="#3d4448" />
    </g>
  ),
  gnome: () => (
    <g>
      <ellipse cx={0} cy={-5} rx={5} ry={5.5} fill="#3b6fc4" />
      <path d="M-4 -10 Q0 -2 4 -10 L3 -4 Q0 0 -3 -4 Z" fill="#f4f1ea" />
      <circle cx={0} cy={-12} r={3.2} fill="#f2c7a5" />
      <path d="M-4 -12 Q0 -6 4 -12 L2 -9 Q0 -6 -2 -9 Z" fill="#f4f1ea" />
      <circle cx={0} cy={-11.5} r={1} fill="#e59a86" />
      <path d="M-4.5 -13.5 L0 -27 L4.5 -13.5 Z" fill="#d8443a" />
    </g>
  ),
  birdhouse: () => (
    <g>
      <rect x={-1.5} y={-22} width={3} height={22} fill={WOOD_DARK} />
      <rect x={-7} y={-34} width={14} height={13} fill="#e6c48a" />
      <path d="M-9 -33 L0 -42 L9 -33 Z" fill="#c4553a" />
      <circle cx={0} cy={-29} r={2.4} fill="#4a2e17" />
      <rect x={-3} y={-25} width={6} height={1.4} fill={WOOD_DARK} />
      <g className="bird">
        <ellipse cx={6} cy={-44} rx={3} ry={2.2} fill="#5a8fd6" />
        <circle cx={8} cy={-45.5} r={1.5} fill="#5a8fd6" />
        <path d="M9.4 -45.5 L11 -45 L9.4 -44.6 Z" fill="#f2b33d" />
      </g>
    </g>
  ),
  scarecrow: () => (
    <g>
      <rect x={-1.5} y={-34} width={3} height={34} fill={WOOD_DARK} />
      <rect x={-14} y={-26} width={28} height={2.5} fill={WOOD_DARK} />
      <path d="M-8 -27 L8 -27 L6 -12 L-6 -12 Z" fill="#6f9fcf" />
      <path d="M-14 -26 L-8 -27 L-8 -22 L-13 -21 Z" fill="#6f9fcf" />
      <path d="M14 -26 L8 -27 L8 -22 L13 -21 Z" fill="#6f9fcf" />
      <path d="M-15 -22 l2 3 l1 -3 M15 -22 l-2 3 l-1 -3" stroke="#e8c45c" strokeWidth={1.2} fill="none" />
      <circle cx={0} cy={-32} r={5} fill="#e9d6a3" />
      <circle cx={-1.8} cy={-32.5} r={0.7} fill="#4a2e17" />
      <circle cx={1.8} cy={-32.5} r={0.7} fill="#4a2e17" />
      <ellipse cx={0} cy={-36} rx={10} ry={2} fill="#c9a24a" />
      <path d="M-5 -36 Q0 -44 5 -36 Z" fill="#c9a24a" />
    </g>
  ),
  beehive: () => (
    <g>
      <rect x={-8} y={-3} width={16} height={3} fill={WOOD_DARK} />
      <ellipse cx={0} cy={-6} rx={9} ry={4} fill="#e8b84a" />
      <ellipse cx={0} cy={-11} rx={8} ry={4} fill="#f0c65a" />
      <ellipse cx={0} cy={-16} rx={6.5} ry={3.5} fill="#e8b84a" />
      <ellipse cx={0} cy={-20} rx={4.5} ry={3} fill="#f0c65a" />
      <ellipse cx={0} cy={-8} rx={2.2} ry={1.6} fill="#5a3a12" />
      {[[-11, -18], [10, -24], [4, -28]].map(([x, y], i) => (
        <g key={i} className="bee" style={{ animationDelay: `${i * 0.7}s` }}>
          <ellipse cx={x} cy={y} rx={1.8} ry={1.2} fill="#2b2b2b" />
          <ellipse cx={x} cy={y} rx={0.6} ry={1.2} fill="#f2c430" />
        </g>
      ))}
    </g>
  ),
  pond: () => (
    <g>
      <ellipse cx={0} cy={0} rx={27} ry={13} fill={STONE_DARK} />
      <ellipse cx={0} cy={-1} rx={25} ry={11.5} fill={STONE} />
      <ellipse cx={0} cy={0} rx={21} ry={9.5} fill={WATER} />
      <ellipse cx={-6} cy={-2} rx={8} ry={2.5} fill={WATER_LIGHT} opacity={0.7} />
      <ellipse cx={8} cy={2} rx={4} ry={2} fill="#5aa64a" />
      <path d="M8 2 L12 1" stroke={WATER} strokeWidth={1} />
      <circle cx={7} cy={1} r={1.3} fill="#f7a8c8" />
    </g>
  ),
  well: () => (
    <g>
      <ellipse cx={0} cy={-2} rx={13} ry={6.5} fill={STONE_DARK} />
      <rect x={-13} y={-12} width={26} height={10} fill={STONE} />
      <path d="M-13 -9 h26 M-13 -5 h26" stroke={STONE_DARK} strokeWidth={0.8} />
      <ellipse cx={0} cy={-12} rx={13} ry={6.5} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-12} rx={10} ry={4.8} fill="#2e4a5a" />
      <rect x={-12} y={-34} width={2.5} height={22} fill={WOOD_DARK} />
      <rect x={9.5} y={-34} width={2.5} height={22} fill={WOOD_DARK} />
      <path d="M-16 -32 L0 -42 L16 -32 Z" fill="#c4553a" />
      <rect x={-10} y={-27} width={20} height={1.6} fill={WOOD} />
      <line x1={0} y1={-26} x2={0} y2={-18} stroke="#6b5a45" strokeWidth={0.8} />
      <rect x={-2} y={-18} width={4} height={3.5} fill={WOOD} />
    </g>
  ),
  fountain: () => (
    <g>
      <ellipse cx={0} cy={0} rx={26} ry={12} fill={STONE_DARK} />
      <rect x={-26} y={-6} width={52} height={6} fill={STONE} />
      <ellipse cx={0} cy={-6} rx={26} ry={12} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-6} rx={22} ry={10} fill={WATER} />
      <rect x={-3} y={-22} width={6} height={16} fill={STONE} />
      <ellipse cx={0} cy={-22} rx={10} ry={4.5} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-22} rx={8} ry={3.4} fill={WATER} />
      <g className="spray">
        <path d="M0 -24 Q-6 -36 -9 -24 M0 -24 Q6 -36 9 -24 M0 -24 L0 -34" stroke={WATER_LIGHT} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx={-8} cy={-6} rx={6} ry={2} fill={WATER_LIGHT} opacity={0.6} />
    </g>
  ),
  windmill: () => (
    <g>
      <path d="M-11 0 L-7 -46 L7 -46 L11 0 Z" fill="#efe2c8" />
      <path d="M2 0 L3 -46 L7 -46 L11 0 Z" fill="#dccdb0" />
      <rect x={-3} y={-11} width={6} height={11} rx={3} fill={WOOD_DARK} />
      <rect x={-2.5} y={-30} width={5} height={5} fill="#7aa7d6" />
      <path d="M-10 -46 L0 -58 L10 -46 Z" fill="#c4553a" />
      <g className="blades" style={{ transformOrigin: "0px -48px" }}>
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a} 0 -48)`}>
            <rect x={-1} y={-78} width={2} height={30} fill={WOOD_DARK} />
            <rect x={1} y={-76} width={7} height={24} fill="#f7f1e3" stroke={WOOD} strokeWidth={0.6} />
          </g>
        ))}
        <circle cx={0} cy={-48} r={2.5} fill={WOOD_DARK} />
      </g>
    </g>
  ),
  birdbath: () => (
    <g>
      <ellipse cx={0} cy={0} rx={6} ry={3} fill={STONE_DARK} />
      <path d="M-3 0 L-2 -14 L2 -14 L3 0 Z" fill={STONE} />
      <path d="M0.5 0 L1 -14 L2 -14 L3 0 Z" fill={STONE_DARK} opacity={0.5} />
      <ellipse cx={0} cy={-15} rx={12} ry={5} fill={STONE_DARK} />
      <ellipse cx={0} cy={-16.5} rx={12} ry={5} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-16.5} rx={9} ry={3.5} fill={WATER} />
      <ellipse cx={-3} cy={-17.5} rx={3.5} ry={1} fill={WATER_LIGHT} />
      <g className="bird">
        <ellipse cx={8} cy={-21} rx={3} ry={2.2} fill="#e0a03a" />
        <circle cx={10} cy={-23} r={1.6} fill="#e0a03a" />
        <path d="M11.4 -23 L13 -22.6 L11.4 -22.2 Z" fill="#c4553a" />
      </g>
    </g>
  ),
  wishing: () => (
    <g>
      <ellipse cx={0} cy={0} rx={18} ry={9} fill={STONE_DARK} />
      <rect x={-18} y={-8} width={36} height={8} fill={STONE} />
      <path d="M-18 -5 h36" stroke={STONE_DARK} strokeWidth={0.8} />
      {[-12, -4, 4, 12].map((x) => <path key={x} d={`M${x} -8 v3 M${x + 4} -5 v5`} stroke={STONE_DARK} strokeWidth={0.6} />)}
      <ellipse cx={0} cy={-8} rx={18} ry={9} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-8} rx={14.5} ry={7} fill="#4a9fc9" />
      {[[-6, -9], [3, -6], [7, -10], [-1, -11], [-8, -6]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={1.6} ry={0.9} fill="#f2c430" />
      ))}
      <rect x={-1.5} y={-26} width={3} height={18} fill={STONE} />
      <ellipse cx={0} cy={-26} rx={4} ry={2} fill={STONE_LIGHT} />
      <path className="drip" d="M0 -26 Q-6 -24 -7 -14 M0 -26 Q6 -24 7 -14" stroke={WATER_LIGHT} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <path d="M-1 -30 l1 -3 l1 3 z" fill="#f2c430" className="glow" />
    </g>
  ),
  tiered: () => (
    <g>
      <ellipse cx={0} cy={0} rx={24} ry={11} fill={STONE_DARK} />
      <rect x={-24} y={-5} width={48} height={5} fill={STONE} />
      <ellipse cx={0} cy={-5} rx={24} ry={11} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-5} rx={20} ry={9} fill={WATER} />
      <rect x={-2.5} y={-20} width={5} height={15} fill={STONE} />
      <ellipse cx={0} cy={-20} rx={14} ry={6} fill={STONE_DARK} />
      <ellipse cx={0} cy={-21.5} rx={14} ry={6} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-21.5} rx={11} ry={4.5} fill={WATER} />
      <rect x={-2} y={-34} width={4} height={12} fill={STONE} />
      <ellipse cx={0} cy={-34} rx={8} ry={3.5} fill={STONE_DARK} />
      <ellipse cx={0} cy={-35} rx={8} ry={3.5} fill={STONE_LIGHT} />
      <ellipse cx={0} cy={-35} rx={6} ry={2.5} fill={WATER} />
      <circle cx={0} cy={-39} r={2} fill={STONE_LIGHT} />
      <g className="drip">
        <path d="M-7 -34 Q-11 -28 -12 -21 M7 -34 Q11 -28 12 -21" stroke={WATER_LIGHT} strokeWidth={1.3} fill="none" />
        <path d="M-13 -20 Q-18 -12 -19 -5 M13 -20 Q18 -12 19 -5" stroke={WATER_LIGHT} strokeWidth={1.3} fill="none" />
        <path d="M0 -41 Q-3 -46 -4 -38 M0 -41 Q3 -46 4 -38" stroke={WATER_LIGHT} strokeWidth={1.2} fill="none" />
      </g>
      <ellipse cx={-8} cy={-6} rx={6} ry={2} fill={WATER_LIGHT} opacity={0.6} />
    </g>
  ),
  statue: () => (
    <g>
      <ellipse cx={0} cy={0} rx={26} ry={12} fill={STONE_DARK} />
      <rect x={-26} y={-6} width={52} height={6} fill="#d8d2c4" />
      <ellipse cx={0} cy={-6} rx={26} ry={12} fill="#ece6d8" />
      <ellipse cx={0} cy={-6} rx={22} ry={10} fill={WATER} />
      <ellipse cx={8} cy={-3} rx={7} ry={2.2} fill={WATER_LIGHT} opacity={0.6} />
      <rect x={-6} y={-16} width={12} height={10} fill="#d8d2c4" />
      <rect x={-7} y={-18} width={14} height={3} fill="#ece6d8" />
      {/* figura con un cántaro */}
      <path d="M-4 -18 L-5 -34 Q0 -38 5 -34 L4 -18 Z" fill="#e8e2d4" />
      <path d="M1 -18 L2 -34 Q4 -35 5 -34 L4 -18 Z" fill="#d3ccbc" />
      <circle cx={0} cy={-41} r={4} fill="#e8e2d4" />
      <path d="M-4 -43 Q0 -48 4 -43 Q2 -45 0 -45 Q-2 -45 -4 -43 Z" fill="#d3ccbc" />
      <path d="M4 -32 L10 -36" stroke="#e8e2d4" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={11} cy={-37} rx={3.5} ry={2.6} fill="#c9b79a" transform="rotate(30 11 -37)" />
      <path className="drip" d="M13 -36 Q18 -30 16 -10" stroke={WATER_LIGHT} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <ellipse cx={16} cy={-9} rx={3} ry={1} fill={WATER_LIGHT} />
    </g>
  ),
};

export function DecorationSprite({ kind }: { kind: string }) {
  return (DRAW[kind] ?? DRAW.mushrooms)();
}

/** Altura aproximada de cada sprite, para centrar las vistas previas. */
export const DECORATION_HEIGHT: Record<string, number> = {
  mushrooms: 14, bench: 22, lamp: 44, gnome: 27, birdhouse: 46, scarecrow: 44,
  beehive: 28, pond: 12, well: 42, fountain: 36, windmill: 80,
  birdbath: 24, wishing: 32, tiered: 44, statue: 48,
};
