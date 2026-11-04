import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DELAY_MS = 450;
const MARGIN = 8;

interface Tip { text: string; rect: DOMRect }

/**
 * Tooltip único para toda la app: los elementos llevan `data-tip="texto"` en vez de `title`.
 * Los tooltips nativos de WebKitGTK no se cierran bien y se apilan al pasar el mouse por varios botones;
 * acá hay uno solo, con retardo al aparecer y cierre inmediato.
 * Si el elemento tiene un hijo `data-tip-label` visible, el tooltip no aparece (ya se lee el texto).
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: number | undefined;
    let target: HTMLElement | null = null;

    const hide = () => {
      window.clearTimeout(timer);
      target = null;
      setTip(null);
    };
    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-tip]") ?? null;
      if (el === target) return;
      hide();
      if (!el) return;
      target = el;
      timer = window.setTimeout(() => {
        const text = el.dataset.tip;
        const label = el.querySelector("[data-tip-label]");
        if (label && label.getClientRects().length > 0) return;
        if (text && el.isConnected) setTip({ text, rect: el.getBoundingClientRect() });
      }, DELAY_MS);
    };

    document.addEventListener("mouseover", onOver);
    document.addEventListener("mousedown", hide, true);
    document.addEventListener("keydown", hide, true);
    document.documentElement.addEventListener("mouseleave", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mousedown", hide, true);
      document.removeEventListener("keydown", hide, true);
      document.documentElement.removeEventListener("mouseleave", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);

  // Debajo del elemento si entra; si no, arriba. Siempre dentro de la ventana.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const { rect } = tip;
    const below = rect.bottom + MARGIN + height <= window.innerHeight - MARGIN;
    const left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    el.style.left = `${left}px`;
    el.style.top = `${below ? rect.bottom + MARGIN : rect.top - MARGIN - height}px`;
    el.style.visibility = "visible";
  }, [tip]);

  if (!tip) return null;
  return <div ref={ref} className="tooltip" role="tooltip" style={{ visibility: "hidden" }}>{tip.text}</div>;
}
