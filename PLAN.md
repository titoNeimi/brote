# Brote — plan de implementación

App de escritorio para medir tiempo de foco (estudio, trabajo, lectura…) donde cada sesión completada hace crecer algo en tu jardín/granja.

## Estado (2026-11-04)

**Fases 1 a 5 implementadas.**

- **Fase 1–2:** temporizador y cronómetro, categorías con metas, historial, jardín isométrico con parcela por categoría, 16 especies en 5 niveles con rarezas, plantas marchitas, monedas.
- **Fase 3:** niveles de jardinero (por minutos de foco), multiplicador de monedas por racha (x1,1 / x1,25 / x1,5), 18 logros con recompensa, bonus por meta semanal, herbario, tienda con 11 decoraciones (desbloqueo por nivel, colocación en el jardín, venta al 50%) y fertilizante (x2 rareza), estaciones según hemisferio con partículas.
- **Fase 4:** pestaña Estadísticas (foco por día/semana apilado por categoría, por categoría, hora del día, heatmap de 6 meses, vista de tabla), exportar CSV y backup/importación JSON.
- **Fase 5:** bandeja del sistema con menú, cerrar a la bandeja, mini ventana siempre visible, Pomodoro con descansos cortos/largos y encadenado, atajo global Ctrl+Shift+Espacio, sonidos ambiente sintetizados (lluvia, viento, ruido marrón), inicio con el sistema.

**Decisiones que cambiaron respecto al plan original:**
- Tema: jardín. Sin versión de consola.
- Visuales en **SVG procedural** en vez de PixiJS: nítido con cualquier zoom, sin assets, cada planta clickeable.
- Persistencia en **JSON** (`tauri-plugin-store`) en vez de SQLite: alcanza para los datos de una persona.
- Gráficos en SVG propio en vez de Recharts, con la paleta de categorías validada para daltonismo.
- La mini ventana no tiene estado propio: la principal le manda el estado por eventos, así un solo proceso escribe los datos.

- **Construcción (v3):** parcelas guardadas como conjunto de baldosas (forma libre, ampliables con monedas, crecen solas al llenarse), 6 caminos pintables, 6 estilos de valla, 5 fuentes, mover plantas (con intercambio) y decoraciones. Migración automática desde v2.

**Pendiente / ideas (Fase 6):** modo estricto (detectar apps prohibidas), etiquetas, notas por sesión, sincronización entre dispositivos.

## Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| Shell de escritorio | **Tauri 2** | Binario chico (~10 MB vs ~150 MB de Electron), tray icon, notificaciones nativas, multiplataforma |
| UI | **React + TypeScript + Vite** | Ya lo usás (chatApp); ecosistema enorme |
| Visuales del jardín | **PixiJS** (canvas 2D) o SVG + CSS para el MVP | Pixel art animado, partículas, 60 fps |
| Estado | **Zustand** | Simple, sin boilerplate |
| Persistencia | **SQLite** (`tauri-plugin-sql`) | Historial consultable, estadísticas con SQL |
| Gráficos | **Recharts** | Estadísticas por categoría/día |
| CLI (opcional) | Node + `ink` reutilizando `core/` | Mismo motor de reglas, interfaz de terminal |

Alternativa si preferís un solo lenguaje y todo "juego": **Godot 4** (GDScript). Más fácil para animaciones, más difícil para formularios/estadísticas.

## Estructura propuesta

```
brote/
├─ core/            # lógica pura TS (sin UI): timer, recompensas, economía, logros
├─ app/             # Tauri + React
│  ├─ src/
│  │  ├─ screens/   # Timer, Jardín, Categorías, Estadísticas, Tienda, Ajustes
│  │  ├─ garden/    # render PixiJS del jardín
│  │  └─ store/
│  └─ src-tauri/    # Rust: tray, notificaciones, DB
├─ cli/             # (fase 5) versión terminal
└─ assets/          # sprites, sonidos
```

`core/` sin dependencias de UI permite testearlo con Vitest y reutilizarlo en la CLI.

---

## Fase 1 — MVP: timer + categorías + historial

- Timer en dos modos: **cuenta regresiva** (elegís 25/50/90 min) y **cronómetro libre**.
- El timer se basa en timestamps (`startedAt`, pausas acumuladas), no en `setInterval` contando — así no se desfasa si la app se minimiza o se suspende la PC.
- Estado persistido: si cerrás la app con una sesión activa, al abrir la retoma.
- CRUD de **categorías**: nombre, color, ícono, meta semanal opcional (ej. Estudio: 10 h/semana).
- Al terminar: se guarda `Session { id, categoryId, start, end, plannedMinutes, actualMinutes, completed, note }`.
- Lista de historial simple.

**Modelo de datos inicial**
```sql
categories(id, name, color, icon, weekly_goal_min, archived)
sessions(id, category_id, started_at, ended_at, planned_min, actual_min, status, note)
-- status: completed | abandoned
```

## Fase 2 — Jardín y recompensas (el núcleo del juego)

**Mecánica central:** al iniciar una sesión elegís una **semilla**. Durante la sesión se ve la planta creciendo en tiempo real. Al completar, la planta se agrega al jardín. Si abandonás antes, la planta se marchita (queda una planta seca — consecuencia visible, sin castigo económico fuerte).

**Recompensas por duración**

| Duración | Resultado |
|---|---|
| < 10 min | Brote pequeño, sin monedas |
| 10–24 min | Planta común + monedas |
| 25–49 min | Planta mediana, chance de variante rara |
| 50–89 min | Arbusto/árbol, más monedas |
| 90+ min | Árbol grande, chance de especie legendaria |

- Monedas = `minutos × multiplicador` (multiplicador por racha, ver fase 3).
- Rareza con tabla de probabilidades en `core/rewards.ts` (fácil de balancear y testear).
- Cada categoría puede tener su **parcela** propia en el jardín (Estudio = huerta, Trabajo = bosque).
- Visual: grilla isométrica o vista lateral; las plantas tienen 3–4 sprites de crecimiento.

**Tabla nueva**
```sql
garden_items(id, session_id, species_id, rarity, plot_id, x, y, state)  -- state: alive | withered
species(id, name, min_minutes, sprite, rarity_weights, unlocked)
wallet(coins)
```

## Fase 3 — Progresión y motivación

- **Rachas**: días consecutivos con ≥ N minutos. Multiplicador de monedas (x1.1, x1.25, x1.5…).
- **Tienda**: comprar semillas nuevas, decoraciones (cercas, caminos, estanque), parcelas extra.
- **Logros**: "Primera hora", "10 h de Estudio", "Racha de 7 días", "Sesión de 2 h sin pausa".
- **Niveles del jardinero** por XP total → desbloquean especies.
- **Metas semanales** por categoría con barra de progreso y recompensa al cumplirla.
- **Estaciones**: el jardín cambia según el mes real (hojas en otoño, nieve en invierno) — solo cosmético, pero da vida.

## Fase 4 — Estadísticas

- Totales hoy / semana / mes / año, por categoría.
- Gráfico de barras por día, torta por categoría.
- **Heatmap estilo GitHub** de días estudiados.
- Mejor hora del día (cuándo más te concentrás), promedio de sesión, tasa de abandono.
- Exportar a CSV/JSON (y backup/restore de la DB).

## Fase 5 — Integración con el escritorio

- **Ícono en la bandeja** con el tiempo restante y menú rápido (iniciar/pausar/parar).
- **Mini-ventana flotante** "always on top" con la planta creciendo y el timer.
- **Notificaciones** al terminar y para descansos (ciclo Pomodoro: foco → pausa corta → pausa larga).
- **Atajo global** para iniciar/pausar.
- Sonidos ambientales opcionales (lluvia, café, bosque) durante la sesión.
- Autoarranque con el sistema (opcional).
- **CLI** (`brote start estudio 50`, `brote status`, `brote stats --week`) usando `core/`, con la misma DB.

## Fase 6 — Extras (más adelante)

- **Modo estricto**: lista de apps/sitios que, si se abren durante la sesión, marchitan la planta (detección de ventana activa desde Rust).
- **Etiquetas** además de categorías (ej. Estudio → #algebra, #parcial).
- **Notas al final de la sesión** ("¿qué hiciste?") — útil para repasar.
- **Tema granja alternativo**: mismas reglas, otra skin (huevos → pollitos → gallinas; ternero → vaca). Diseñar `species` de forma genérica desde el inicio para que esto sea solo assets.
- **Sincronización** opcional entre dispositivos / jardín compartido con amigos (requiere backend; dejar para el final).
- Integración con Google Calendar para registrar las sesiones como eventos.

---

## Orden sugerido y estimación aproximada

1. Scaffold Tauri + React + SQLite, `core/` con timer y tests — *1–2 días*
2. Fase 1 completa — *2–3 días*
3. Fase 2 con visuales simples (SVG/CSS), después migrar a PixiJS — *4–6 días*
4. Fase 3 — *3–4 días*
5. Fase 4 — *2–3 días*
6. Fase 5 — *3–4 días*

## Decisiones abiertas

- Tema principal: ¿jardín, granja o ambos como skins?
- Estilo visual: pixel art, low-poly 2D o ilustrado/flat.
- Assets: hechos a mano, packs libres (ej. itch.io con licencia CC0) o generados.
- ¿La CLI es prioridad o es un extra?
