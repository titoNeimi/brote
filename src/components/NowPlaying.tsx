import { useEffect, useRef, useState } from "react";
import { setMediaVolume, useNowPlaying } from "../lib/media";

/** Widget compacto del reproductor del sistema. No se muestra si no suena nada. */
export function NowPlaying() {
  const { info, control } = useNowPlaying();
  if (!info) return null;

  const icon = (d: string) => (
    <svg viewBox="0 0 20 20" width={16} height={16} fill="currentColor" aria-hidden><path d={d} /></svg>
  );

  return (
    <div className="now-playing" aria-label="Sonando ahora">
      {info.art
        ? <img className="np-art" src={info.art} alt="" draggable={false} />
        : <div className="np-art np-art-empty" aria-hidden>♪</div>}
      <div className="np-text">
        <div className="np-title" data-tip={info.album || undefined}>{info.title}</div>
        <div className="np-artist muted small">{info.artist}</div>
      </div>
      <div className="np-controls">
        <button className="icon" aria-label="Anterior" disabled={!info.canPrevious} onClick={() => control("previous")}>
          {icon("M5 4h2v12H5zM17 4v12L8 10z")}
        </button>
        <button className="icon np-main" aria-label={info.playing ? "Pausar" : "Reproducir"}
          disabled={!info.canPlayPause} onClick={() => control("toggle")}>
          {info.playing ? icon("M5 4h3.5v12H5zM11.5 4H15v12h-3.5z") : icon("M6 3.5v13L16.5 10z")}
        </button>
        <button className="icon" aria-label="Siguiente" disabled={!info.canNext} onClick={() => control("next")}>
          {icon("M13 4h2v12h-2zM3 4v12l9-6z")}
        </button>
      </div>
      {info.volume != null && <VolumeSlider key={info.source} volume={info.volume} />}
    </div>
  );
}

/**
 * Volumen de la app que suena. Mientras se arrastra (y un rato después) manda el valor local,
 * para que el sondeo cada 2 s no haga saltar el control.
 */
function VolumeSlider({ volume }: { volume: number }) {
  const [local, setLocal] = useState(volume);
  const touchedAt = useRef(0);
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const beforeMute = useRef(0.5);

  useEffect(() => {
    if (Date.now() - touchedAt.current > 2500) setLocal(volume);
  }, [volume]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (v: number) => {
    setLocal(v);
    touchedAt.current = Date.now();
    pending.current = v;
    // Como mucho un envío cada 60 ms.
    if (timer.current) return;
    const flush = () => {
      timer.current = undefined;
      if (pending.current == null) return;
      void setMediaVolume(pending.current).catch(() => {});
      pending.current = null;
      timer.current = setTimeout(flush, 60);
    };
    flush();
  };

  const muted = local < 0.01;
  const toggleMute = () => {
    if (muted) change(beforeMute.current || 0.5);
    else { beforeMute.current = local; change(0); }
  };

  return (
    <div className="np-volume">
      <button className="icon" aria-label={muted ? "Activar sonido" : "Silenciar"} onClick={toggleMute}>
        <svg viewBox="0 0 20 20" width={16} height={16} aria-hidden>
          <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
          {muted ? (
            <path d="M13 7.5l5 5M18 7.5l-5 5" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
          ) : (
            <g fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
              <path d="M13 7.5a3.5 3.5 0 0 1 0 5" />
              {local > 0.5 && <path d="M15.3 5.2a6.8 6.8 0 0 1 0 9.6" />}
            </g>
          )}
        </svg>
      </button>
      <input type="range" min={0} max={1} step={0.01} value={local} aria-label="Volumen de la música"
        onChange={(e) => change(Number(e.target.value))} />
      <span className="muted small np-vol-pct">{Math.round(local * 100)}%</span>
    </div>
  );
}
