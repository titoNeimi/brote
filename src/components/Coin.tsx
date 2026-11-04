/**
 * Moneda dibujada en SVG. Reemplaza al emoji 🪙 (Unicode 13), que la fuente de emojis
 * de Windows 10 no trae y se ve como un cuadrado vacío.
 */
export function Coin({ title }: { title?: string }) {
  return (
    <svg className="coin-icon" viewBox="0 0 16 16" width="1em" height="1em" role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true} aria-label={title}>
      <circle cx={8} cy={8} r={7.5} fill="#c98a0e" />
      <circle cx={8} cy={7.4} r={6.6} fill="#f5c02a" />
      <circle cx={8} cy={7.4} r={4.6} fill="none" stroke="#d99a12" strokeWidth={1.2} />
      <path d="M5.6 5.2 Q6.6 4 8 3.9" fill="none" stroke="#fff3b0" strokeWidth={1.1} strokeLinecap="round" />
    </svg>
  );
}
