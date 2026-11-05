import { useEffect, useRef, useState, type ReactNode } from "react";
import { exportBackup, parseBackup, useStore, type Ambient } from "../store";
import { SPECIES_BY_ID } from "../core/rewards";
import { SEASON_LABEL, type Season } from "../core/seasons";
import { DAY_PHASE_LABEL, type DayPhasePref } from "../core/daynight";
import { AMBIENT_LABEL } from "../lib/ambient";
import { isTauri } from "../lib/platform";
import { useUpdater } from "../lib/updater";
import { UpdateControls } from "./UpdatePanel";
import { getAutostart, GLOBAL_SHORTCUT, openMiniWindow, saveTextFile, setAutostart, useDesktopStatus } from "../lib/desktop";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="grow">
        <div>{label}</div>
        {hint && <div className="muted small">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} className={`toggle${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sessionsCsv(): string {
  const { sessions, categories, plants } = useStore.getState();
  const cat = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const plant = Object.fromEntries(plants.map((p) => [p.id, p]));
  const iso = (t: number) => new Date(t).toISOString();
  const rows = [["inicio", "fin", "categoria", "minutos", "modo", "estado", "planta", "monedas", "nombre"]];
  for (const s of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    const p = s.plantId ? plant[s.plantId] : null;
    rows.push([
      iso(s.startedAt), iso(s.endedAt), cat[s.categoryId] ?? s.categoryId, (s.focusedMs / 60_000).toFixed(1),
      s.mode === "countdown" ? "temporizador" : "cronometro", s.status === "completed" ? "completada" : "abandonada",
      p ? (p.withered ? "marchita" : SPECIES_BY_ID[p.speciesId]?.name ?? p.speciesId) : "", String(s.coins), s.title ?? "",
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function SettingsView() {
  const prefs = useStore((s) => s.prefs);
  const appVersion = useUpdater((s) => s.currentVersion);
  const setPrefs = useStore((s) => s.setPrefs);
  const setPomodoro = useStore((s) => s.setPomodoro);
  const importBackup = useStore((s) => s.importBackup);
  const shortcutOk = useDesktopStatus((s) => s.shortcutRegistered);
  const [autostart, setAutostartState] = useState<boolean | null>(null);
  const [pending, setPending] = useState<{ data: unknown; summary: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isTauri) void getAutostart().then(setAutostartState).catch(() => setAutostartState(null));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const parsed = parseBackup(data);
      setPending({ data, summary: `${parsed.sessions.length} sesiones, ${parsed.plants.length} plantas, ${parsed.coins} monedas` });
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="page">
      <section className="panel">
        <h3>Sonido</h3>
        <Row label="Efectos de sonido" hint="Al completar una sesión o un descanso.">
          <Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} />
        </Row>
        <Row label="Sonido ambiente" hint="Suena solo mientras una sesión está corriendo.">
          <select value={prefs.ambient} onChange={(e) => setPrefs({ ambient: e.target.value as Ambient })}>
            {(Object.keys(AMBIENT_LABEL) as Ambient[]).map((k) => <option key={k} value={k}>{AMBIENT_LABEL[k]}</option>)}
          </select>
        </Row>
        {prefs.ambient !== "none" && (
          <Row label="Volumen del ambiente">
            <input type="range" min={0} max={1} step={0.05} value={prefs.ambientVolume} className="volume"
              onChange={(e) => setPrefs({ ambientVolume: Number(e.target.value) })} />
          </Row>
        )}
      </section>

      <section className="panel">
        <h3>Pomodoro</h3>
        <Row label="Descansos automáticos" hint="Después de cada temporizador completado empieza un descanso.">
          <Toggle checked={prefs.pomodoro.enabled} onChange={(v) => setPomodoro({ enabled: v })} />
        </Row>
        {prefs.pomodoro.enabled && (
          <>
            <Row label="Descanso corto">
              <NumberInput value={prefs.pomodoro.shortMin} min={1} max={30} suffix="min" onChange={(v) => setPomodoro({ shortMin: v })} />
            </Row>
            <Row label="Descanso largo">
              <NumberInput value={prefs.pomodoro.longMin} min={5} max={60} suffix="min" onChange={(v) => setPomodoro({ longMin: v })} />
            </Row>
            <Row label="Descanso largo cada">
              <NumberInput value={prefs.pomodoro.every} min={2} max={8} suffix="sesiones" onChange={(v) => setPomodoro({ every: v })} />
            </Row>
            <Row label="Encadenar sesiones" hint="Al terminar el descanso, arranca otra sesión con la misma configuración.">
              <Toggle checked={prefs.pomodoro.autoStartFocus} onChange={(v) => setPomodoro({ autoStartFocus: v })} />
            </Row>
          </>
        )}
      </section>

      {isTauri && (
        <section className="panel">
          <h3>Escritorio</h3>
          <Row label="Cerrar a la bandeja" hint="La X oculta la ventana y Brote sigue contando en la bandeja del sistema.">
            <Toggle checked={prefs.closeToTray} onChange={(v) => setPrefs({ closeToTray: v })} />
          </Row>
          <Row label="Iniciar con el sistema" hint="Arranca minimizado en la bandeja.">
            {autostart == null ? <span className="muted small">No disponible</span> : (
              <Toggle checked={autostart} onChange={async (v) => { await setAutostart(v); setAutostartState(await getAutostart()); }} />
            )}
          </Row>
          <Row label="Atajo global" hint={shortcutOk === false ? "Otra aplicación ya usa este atajo." : "Pausa o reanuda la sesión; si no hay ninguna, planta una nueva."}>
            <kbd>{GLOBAL_SHORTCUT.replace("CommandOrControl", "Ctrl").replace(/\+/g, " + ")}</kbd>
          </Row>
          <Row label="Mini ventana" hint="Ventana chica siempre visible con el temporizador.">
            <button onClick={() => void openMiniWindow()}>Abrir</button>
          </Row>
        </section>
      )}

      {isTauri && (
        <section className="panel">
          <h3>Actualizaciones</h3>
          <Row label="Buscar automáticamente" hint={`Al abrir Brote y cada 6 horas. Versión instalada: ${appVersion ?? "—"}.`}>
            <Toggle checked={prefs.autoUpdate} onChange={(v) => setPrefs({ autoUpdate: v })} />
          </Row>
          <UpdateControls />
        </section>
      )}

      <section className="panel">
        <h3>Jardín</h3>
        <Row label="Hemisferio" hint="Para saber en qué estación estás.">
          <div className="segmented">
            <button className={prefs.hemisphere === "south" ? "on" : ""} onClick={() => setPrefs({ hemisphere: "south" })}>Sur</button>
            <button className={prefs.hemisphere === "north" ? "on" : ""} onClick={() => setPrefs({ hemisphere: "north" })}>Norte</button>
          </div>
        </Row>
        <Row label="Estación">
          <select value={prefs.season} onChange={(e) => setPrefs({ season: e.target.value as Season | "auto" })}>
            <option value="auto">Automática</option>
            {(Object.keys(SEASON_LABEL) as Season[]).map((s) => <option key={s} value={s}>{SEASON_LABEL[s]}</option>)}
          </select>
        </Row>
        <Row label="Día y noche" hint="En automático sigue la hora de tu computadora. De noche se encienden los faroles.">
          <select value={prefs.dayNight} onChange={(e) => setPrefs({ dayNight: e.target.value as DayPhasePref })}>
            <option value="auto">Automático</option>
            {(Object.keys(DAY_PHASE_LABEL) as (keyof typeof DAY_PHASE_LABEL)[]).map((p) => (
              <option key={p} value={p}>{DAY_PHASE_LABEL[p]}</option>
            ))}
          </select>
        </Row>
      </section>

      <section className="panel">
        <h3>Datos</h3>
        <Row label="Exportar sesiones" hint="Planilla CSV para Excel o Google Sheets.">
          <button onClick={() => void saveTextFile(`brote-sesiones-${today}.csv`, sessionsCsv(), "csv")}>Exportar CSV</button>
        </Row>
        <Row label="Copia de seguridad" hint="Todo tu jardín, historial y monedas en un archivo JSON.">
          <div className="row">
            <button onClick={() => void saveTextFile(`brote-backup-${today}.json`, exportBackup(), "json")}>Exportar</button>
            <button onClick={() => fileRef.current?.click()}>Importar…</button>
          </div>
        </Row>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        {pending && (
          <div className="confirm">
            <p>¿Reemplazar <strong>todos</strong> tus datos actuales con este backup? ({pending.summary})</p>
            <div className="row">
              <button className="danger" onClick={() => { importBackup(pending.data); setPending(null); setMessage("Backup importado."); }}>
                Sí, importar
              </button>
              <button onClick={() => setPending(null)}>Cancelar</button>
            </div>
          </div>
        )}
        {message && <p className="small">{message}</p>}
      </section>
    </div>
  );
}

function NumberInput({ value, min, max, suffix, onChange }: { value: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <label className="num">
      <input type="number" value={value} min={min} max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, Math.round(v))));
        }} />
      {suffix}
    </label>
  );
}
