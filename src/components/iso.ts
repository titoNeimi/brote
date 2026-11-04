export const TILE_W = 64;
export const TILE_H = 32;

/** Esquina superior de la baldosa (gx, gy) en coordenadas de pantalla. */
export function iso(gx: number, gy: number) {
  return { x: (gx - gy) * (TILE_W / 2), y: (gx + gy) * (TILE_H / 2) };
}

export function diamond(gx: number, gy: number): string {
  const a = iso(gx, gy), b = iso(gx + 1, gy), c = iso(gx + 1, gy + 1), d = iso(gx, gy + 1);
  return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
}

/** Hash determinístico por celda, para que los detalles no cambien entre renders. */
export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
