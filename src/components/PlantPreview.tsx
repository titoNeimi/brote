import { PlantSprite, Sparkles, TIER_HEIGHT } from "./PlantSprite";
import { SPECIES_BY_ID } from "../core/rewards";
import type { Rarity } from "../core/types";

/** Una sola baldosa isométrica de tierra con una planta encima. */
export function PlantPreview({
  speciesId,
  growth = 1,
  withered = false,
  rarity = "common",
  size = 160,
}: {
  speciesId: string;
  growth?: number;
  withered?: boolean;
  rarity?: Rarity;
  size?: number;
}) {
  const tier = SPECIES_BY_ID[speciesId]?.tier ?? 0;
  return (
    <svg width={size} height={size} viewBox="-60 -95 120 120" className="plant-preview">
      <polygon points="0,-12 48,12 0,36 -48,12" fill="#6fb550" transform="translate(0 4)" />
      <polygon points="-48,16 0,40 0,50 -48,26" fill="#8a5a3b" />
      <polygon points="48,16 0,40 0,50 48,26" fill="#6e4630" />
      <polygon points="0,-8 48,16 0,40 -48,16" fill="#8ccf6a" />
      <polygon points="0,-1 32,14 0,29 -32,14" fill="#9a6b45" />
      <ellipse cx={0} cy={15} rx={(8 + tier * 3) * growth} ry={(4 + tier * 1.5) * growth} fill="#000" opacity={0.15} />
      <g transform="translate(0 14) scale(1.25)">
        <PlantSprite speciesId={speciesId} growth={growth} withered={withered} />
        {!withered && rarity !== "common" && <Sparkles rarity={rarity} height={TIER_HEIGHT[tier] * growth} />}
      </g>
    </svg>
  );
}
