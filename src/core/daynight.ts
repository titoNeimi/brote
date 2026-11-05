export type DayPhase = "day" | "dusk" | "night";
export type DayPhasePref = DayPhase | "auto";

export const DAY_PHASE_LABEL: Record<DayPhase, string> = {
  day: "Día",
  dusk: "Atardecer",
  night: "Noche",
};

/** Fase según la hora local: noche de 20 a 6, atardecer/amanecer en los bordes. */
export function phaseFor(date: Date): DayPhase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 20.5 || h < 5.5) return "night";
  if (h >= 18.5 || h < 7) return "dusk";
  return "day";
}

export interface PhaseTheme {
  /** Cielo de fondo (de arriba hacia abajo). */
  sky: [string, string] | null;
  /** Velo que oscurece el jardín (se multiplica sobre los colores). */
  tint: string | null;
  tintOpacity: number;
  /** Cuánto brillan los faroles (0 = apagados). */
  lights: number;
  stars: boolean;
}

export const PHASE_THEME: Record<DayPhase, PhaseTheme> = {
  day: { sky: null, tint: null, tintOpacity: 0, lights: 0, stars: false },
  dusk: { sky: ["#f2a679", "#f6d6a8"], tint: "#c9704f", tintOpacity: 0.35, lights: 0.6, stars: false },
  night: { sky: ["#0e1733", "#25345e"], tint: "#1b2552", tintOpacity: 0.72, lights: 1, stars: true },
};
