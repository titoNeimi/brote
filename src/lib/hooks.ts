import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Agrega la clase `compact` a la barra cuando las pestañas con texto no entran,
 * en vez de depender de un ancho fijo (el contador de foco y las monedas cambian de largo).
 */
export function useCompactTabs(headerRef: RefObject<HTMLElement | null>, ready: boolean) {
  useLayoutEffect(() => {
    const header = headerRef.current;
    const nav = header?.querySelector<HTMLElement>(".tabs");
    if (!header || !nav) return;
    let fullWidth = 0;
    const check = () => {
      if (!header.classList.contains("compact")) fullWidth = nav.scrollWidth;
      const style = getComputedStyle(header);
      const others = [...header.children].filter((c) => c !== nav)
        .reduce((w, c) => w + c.getBoundingClientRect().width, 0);
      const gaps = parseFloat(style.columnGap || "0") * (header.children.length - 1);
      const available = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - others - gaps;
      header.classList.toggle("compact", fullWidth > available);
    };
    const ro = new ResizeObserver(check);
    ro.observe(header);
    [...header.children].forEach((c) => c !== nav && ro.observe(c));
    check();
    return () => ro.disconnect();
  }, [headerRef, ready]);
}
