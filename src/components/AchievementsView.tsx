import { useStore } from "../store";
import { ACHIEVEMENTS, STREAK_STEPS } from "../core/progression";
import { SPECIES, RARITY_LABEL } from "../core/rewards";
import { PlantPreview } from "./PlantPreview";
import { Coin } from "./Coin";

const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });

export function AchievementsView() {
  const unlocked = useStore((s) => s.achievements);
  const plants = useStore((s) => s.plants);
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const found = new Set(plants.filter((p) => !p.withered).map((p) => p.speciesId));

  return (
    <div className="page">
      <section className="panel">
        <div className="panel-head">
          <h3>Logros</h3>
          <span className="muted small">{count} de {ACHIEVEMENTS.length}</span>
        </div>
        <div className="bar"><div style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }} /></div>
        <div className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const at = unlocked[a.id];
            return (
              <div key={a.id} className={`achievement${at ? " done" : ""}`}>
                <div className="ach-icon">{a.icon}</div>
                <div className="grow">
                  <strong>{a.name}</strong>
                  <div className="muted small">{a.description}</div>
                  <div className="small">{at ? `✓ ${dateFmt.format(at)}` : <>+{a.reward} <Coin /></>}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Herbario</h3>
          <span className="muted small">{found.size} de {SPECIES.length} especies</span>
        </div>
        <div className="herbarium">
          {SPECIES.map((s) => (
            <div key={s.id} className={`specimen${found.has(s.id) ? "" : " unknown"}`}>
              <PlantPreview speciesId={s.id} rarity={s.rarity} size={86} />
              <strong className="small">{found.has(s.id) ? s.name : "???"}</strong>
              <span className={`badge ${s.rarity}`}>{RARITY_LABEL[s.rarity]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Bonus por racha</h3>
        <p className="muted small">Estudiar días seguidos multiplica las monedas de cada sesión.</p>
        <div className="streak-steps">
          {[...STREAK_STEPS].reverse().map((s) => (
            <div key={s.days}><strong>🔥 {s.days} días</strong><span>x{s.mult}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
