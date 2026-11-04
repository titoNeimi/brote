# 🌱 Brote

Temporizador de foco para escritorio. Cada sesión de estudio o trabajo hace crecer una planta en tu jardín isométrico: cuanto más tiempo te concentrás, más grande y rara es la planta. Si te rendís antes de que termine el temporizador, se marchita.

## Cómo correrlo

Requisitos: [Node 20+](https://nodejs.org) y [Rust](https://rustup.rs). En Windows también hace falta WebView2 (viene con Windows 10/11) y las "C++ build tools" de Visual Studio. En Linux, los [prerrequisitos de Tauri](https://v2.tauri.app/start/prerequisites/#linux).

```bash
npm install
npm run tauri dev      # app de escritorio con recarga en caliente
npm run tauri build    # instalador en src-tauri/target/release/bundle/
```

Solo la interfaz, en el navegador (guarda en localStorage):

```bash
npm run dev            # http://localhost:1420
```

> **WSL:** `npm run tauri dev` funciona con WSLg, pero para un `.exe` nativo de Windows corré `npm install` y `npm run tauri build` desde Windows (no reutilices el `node_modules` de WSL).

Tests de la lógica: `npm test`.

## Cómo se juega

| Foco | Crece | Especies |
|---|---|---|
| < 10 min | Brote | Brote · *Trébol de cuatro hojas* |
| 10 min | Flor | Margarita, Tulipán · *Campanilla azul* |
| 25 min | Planta | Girasol, Lavanda · *Rosal* |
| 50 min | Arbusto | Arbusto, Hortensia · *Arándano* · **Flor de cristal** |
| 90 min | Árbol | Roble, Pino · *Cerezo en flor* · **Árbol dorado** |

*Cursiva* = rara (x1,5 monedas), **negrita** = legendaria (x3). Ganás 1 moneda por minuto.

- **Temporizador**: elegís la duración. Si te rendís antes, la planta se marchita (y no da monedas).
- **Cronómetro libre**: sin meta; cosechás cuando quieras.
- **Racha**: 3, 7 y 14 días seguidos multiplican las monedas por 1,1 / 1,25 / 1,5.
- **Niveles**: suben con los minutos de foco y desbloquean decoraciones en la tienda.
- **Tienda**: decoraciones para colocar en el jardín y fertilizante (duplica la chance de rara/legendaria).
- **Logros** y **metas semanales** dan monedas extra.
- **Pomodoro** (opcional, en Ajustes): descanso corto después de cada temporizador y uno largo cada N.
- **Estaciones**: el jardín cambia con la estación real según tu hemisferio.

### Construir 🔨

Botón **Construir** arriba a la derecha del jardín:

- **Caminos** (6 tipos: tierra, grava, piedras sueltas, adoquines, ladrillo, tablas): se pintan sobre el pasto con click o arrastrando. Borrarlos devuelve la mitad.
- **Parcelas**: sumá baldosas pegadas a una parcela (se resaltan) para darle la forma que quieras. Cada baldosa cuesta un poco más. Si una parcela se llena, crece sola una fila (gratis).
- **Vallas** (madera, blanca, bambú, seto, muro de piedra, hierro forjado): cada estilo se compra una vez y se aplica gratis a cualquier parcela.
- **Adornos**: fuentes (bebedero, de los deseos, de piedra, de tres pisos, con estatua) y decoraciones.
- **Mover**: hacé click en una planta o decoración y elegí *Mover*. Las plantas se mueven dentro de su parcela; si el lugar está ocupado, se intercambian.

En modo construcción, la vista se mueve arrastrando con clic derecho o la rueda. `Esc` suelta la herramienta.

### Atajos y escritorio

- `Ctrl + Shift + Espacio` (global): pausa/reanuda la sesión, o planta una nueva si no hay ninguna.
- La **X** de la ventana la manda a la bandeja del sistema (se puede desactivar). Desde la bandeja: mostrar, pausar, mini ventana, salir.
- **Mini ventana** (botón ⧉): temporizador chiquito siempre visible.
- En Ajustes: sonido ambiente, inicio con el sistema, exportar CSV y backup/importación.

## Estructura

```
src/
├─ core/          lógica pura y testeada: timer, recompensas, jardín, progresión, tienda, estaciones, estadísticas
├─ components/    Garden (isométrico SVG), sprites, TimerPanel, vistas (Estadísticas, Tienda, Logros, Ajustes…)
├─ lib/           persistencia, notificaciones, sonido ambiente, integración de escritorio
├─ controller.ts  tick global: completa sesiones/descansos, bandeja, título, mini ventana
├─ store.ts       estado global (Zustand) persistido y migraciones
└─ MiniApp.tsx    mini ventana (sin estado propio)
src-tauri/        shell de escritorio (Rust): bandeja, cerrar a bandeja, plugins
```

Los datos se guardan en `brote.json`, en la carpeta de datos de la app (`%APPDATA%\com.brote.app` en Windows, `~/.local/share/com.brote.app` en Linux).
