# Publicar una versión

Brote se actualiza solo con `tauri-plugin-updater`. Las versiones se publican como Releases de
este repo (`titoNeimi/brote`, público), y la app consulta:
`https://github.com/titoNeimi/brote/releases/latest/download/latest.json`

## Publicar (cada vez)

```bash
npm version patch        # 0.1.0 → 0.1.1 (o minor / major). Crea el commit y la etiqueta v0.1.1
git push --follow-tags   # GitHub Actions compila, firma y publica
```

La versión sale de `package.json` (`tauri.conf.json` la lee de ahí). En ~10–15 min aparece la Release
y las copias instaladas la ven en el próximo chequeo (al abrir y cada 6 h, o con
Ajustes → Actualizaciones → Buscar actualizaciones).

Para escribir notas de la versión, editá la Release en GitHub, o cambiá `releaseBody` en
`.github/workflows/release.yml`.

## Configuración inicial (una sola vez)

1. **Llave de firma.** Las actualizaciones se firman; la app solo instala las firmadas con esta llave.
   ```bash
   npx tauri signer generate -w ~/.tauri/brote.key
   ```
   Genera `~/.tauri/brote.key` (privada) y `~/.tauri/brote.key.pub` (pública). La pública ya está en
   `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

   > ⚠️ Guardá la llave privada y su contraseña en un gestor de contraseñas. Si se pierden,
   > las copias ya instaladas no pueden recibir más actualizaciones. Nunca la subas al repo.

2. **Secrets del repo** (Settings → Secrets and variables → Actions):
   | Nombre | Valor |
   |---|---|
   | `TAURI_SIGNING_PRIVATE_KEY` | contenido de `~/.tauri/brote.key` |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | la contraseña de la llave |

## Notas

- **SmartScreen:** el instalador no tiene certificado de firma de código, así que la primera
  instalación muestra "Windows protegió su PC" → *Más información* → *Ejecutar de todas formas*.
- **Durante una sesión** la app no deja instalar (se reinicia); el botón se habilita al terminar.
- El instalador corre en modo `passive`: muestra una barra de progreso, sin preguntas.
