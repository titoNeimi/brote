import { useStore } from "../store";
import { checkForUpdates, installUpdate, useUpdater } from "../lib/updater";

const timeFmt = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });

/** Botón de instalar. Durante una sesión no se permite: la app se reinicia. */
function InstallButton({ version }: { version: string }) {
  const busy = useStore((s) => s.active != null);
  return (
    <button className="primary" disabled={busy} onClick={() => void installUpdate()}
      data-tip={busy ? "Terminá la sesión antes de actualizar" : undefined}>
      Actualizar a {version}
    </button>
  );
}

function Progress() {
  const status = useUpdater((s) => s.status);
  if (status.kind === "installing") return <p className="muted small">Instalando… Brote se va a reiniciar.</p>;
  if (status.kind !== "downloading") return null;
  return (
    <>
      <p className="muted small">Descargando{status.progress != null ? ` · ${Math.round(status.progress * 100)}%` : "…"}</p>
      <div className="bar"><div style={{ width: `${(status.progress ?? 0.1) * 100}%` }} /></div>
    </>
  );
}

/** Estado y botones de actualización, para la sección de Ajustes. */
export function UpdateControls() {
  const status = useUpdater((s) => s.status);

  return (
    <div className="update-controls">
      {status.kind === "available" ? (
        <div className="update-available">
          <p>Hay una versión nueva: <strong>{status.version}</strong></p>
          {status.notes && <p className="muted small update-notes">{status.notes}</p>}
          <InstallButton version={status.version} />
        </div>
      ) : (
        <div className="row">
          <button disabled={status.kind === "checking" || status.kind === "downloading" || status.kind === "installing"}
            onClick={() => void checkForUpdates()}>
            {status.kind === "checking" ? "Buscando…" : "Buscar actualizaciones"}
          </button>
          {status.kind === "up-to-date" && <span className="muted small">Estás al día ({timeFmt.format(status.checkedAt)})</span>}
        </div>
      )}
      {status.kind === "error" && <p className="small danger-text">{status.message}</p>}
      <Progress />
    </div>
  );
}

/** Aviso flotante cuando aparece una versión nueva. */
export function UpdateBanner() {
  const status = useUpdater((s) => s.status);
  const dismissed = useUpdater((s) => s.dismissedVersion);
  const show = status.kind === "downloading" || status.kind === "installing"
    || (status.kind === "available" && status.version !== dismissed);
  if (!show) return null;

  return (
    <div className="panel update-banner" role="status">
      {status.kind === "available" ? (
        <>
          <div className="grow">
            <strong>🌱 Nueva versión {status.version}</strong>
            <div className="muted small">Tus datos se mantienen.</div>
          </div>
          <InstallButton version={status.version} />
          <button className="icon close" aria-label="Más tarde"
            onClick={() => useUpdater.setState({ dismissedVersion: status.version })}>✕</button>
        </>
      ) : (
        <div className="grow"><Progress /></div>
      )}
    </div>
  );
}
