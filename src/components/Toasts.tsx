import { useStore } from "../store";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">
          <span className="toast-icon">{t.icon}</span>
          <div className="grow">
            <strong>{t.title}</strong>
            {t.body && <div className="muted small">{t.body}</div>}
          </div>
          <button className="icon close" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
