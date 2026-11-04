//! "Sonando ahora": lee y controla el reproductor que esté activo en el sistema
//! (Spotify, YouTube en el navegador, etc.) sin cuentas ni claves de API.
//!
//! - Windows: System Media Transport Controls (SMTC).
//! - Linux: MPRIS por D-Bus.
//! - macOS: no hay API pública; devuelve `None`.

use serde::Serialize;

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub playing: bool,
    pub can_play_pause: bool,
    pub can_next: bool,
    pub can_previous: bool,
    /// data: URL o https: URL de la portada.
    pub art: Option<String>,
    /// Identificador de la app que reproduce (p. ej. "Spotify.exe").
    pub source: String,
    /// Volumen de esa app entre 0 y 1; `None` si no se puede controlar.
    pub volume: Option<f32>,
}

#[derive(Clone, Copy)]
pub enum Action {
    Play,
    Pause,
    Toggle,
    Next,
    Previous,
}

impl Action {
    pub fn parse(s: &str) -> Option<Self> {
        Some(match s {
            "play" => Self::Play,
            "pause" => Self::Pause,
            "toggle" => Self::Toggle,
            "next" => Self::Next,
            "previous" => Self::Previous,
            _ => return None,
        })
    }
}

/// La portada se pide de nuevo solo cuando cambia el tema.
mod art_cache {
    use std::sync::Mutex;
    static CACHE: Mutex<Option<(String, Option<String>)>> = Mutex::new(None);

    pub fn get_or(key: &str, load: impl FnOnce() -> Option<String>) -> Option<String> {
        if let Some((k, v)) = CACHE.lock().unwrap().as_ref() {
            if k == key {
                return v.clone();
            }
        }
        let v = load();
        *CACHE.lock().unwrap() = Some((key.to_string(), v.clone()));
        v
    }
}

fn data_url(mime: &str, bytes: &[u8]) -> String {
    use base64::Engine;
    format!("data:{};base64,{}", mime, base64::engine::general_purpose::STANDARD.encode(bytes))
}

/// Entre varias sesiones, la que está sonando; si ninguna suena, Spotify; si no, la primera.
fn pick<T>(items: Vec<T>, playing: impl Fn(&T) -> bool, name: impl Fn(&T) -> String) -> Option<T> {
    let idx = items
        .iter()
        .position(&playing)
        .or_else(|| items.iter().position(|t| name(t).to_lowercase().contains("spotify")))
        .or(if items.is_empty() { None } else { Some(0) })?;
    items.into_iter().nth(idx)
}

#[cfg(windows)]
mod imp {
    use super::*;
    use windows::core::Result;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    };
    use windows::Storage::Streams::DataReader;
    use windows::Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED};

    /// Volumen por app con el mezclador de Windows (lo que muestra el "Mezclador de volumen").
    /// SMTC no expone volumen, así que se buscan las sesiones de audio del mismo proceso.
    mod mixer {
        use windows::core::{Interface, Result, PWSTR};
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::Media::Audio::{
            eMultimedia, eRender, IAudioSessionControl2, IAudioSessionManager2, IMMDeviceEnumerator,
            ISimpleAudioVolume, MMDeviceEnumerator,
        };
        use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_ALL};
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
        };

        fn exe_name(pid: u32) -> Option<String> {
            unsafe {
                let h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
                let mut buf = [0u16; 512];
                let mut len = buf.len() as u32;
                let ok = QueryFullProcessImageNameW(h, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut len);
                let _ = CloseHandle(h);
                ok.ok()?;
                let path = String::from_utf16_lossy(&buf[..len as usize]);
                let file = path.rsplit('\\').next()?.to_lowercase();
                Some(file.trim_end_matches(".exe").to_string())
            }
        }

        /// "Spotify.exe", "SpotifyAB.SpotifyMusic_xxx!Spotify", "MSEdge"… → comparable con el nombre del .exe.
        fn matches(source: &str, exe: &str) -> bool {
            let src = source.to_lowercase();
            let src = src.trim_end_matches(".exe");
            !exe.is_empty() && (src == exe || src.contains(exe) || (src.len() >= 4 && exe.contains(src)))
        }

        /// Todas las sesiones de audio de la app (un navegador puede tener varias).
        pub fn volumes(source: &str) -> Result<Vec<ISimpleAudioVolume>> {
            unsafe {
                let en: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
                let dev = en.GetDefaultAudioEndpoint(eRender, eMultimedia)?;
                let mgr: IAudioSessionManager2 = dev.Activate(CLSCTX_ALL, None)?;
                let list = mgr.GetSessionEnumerator()?;
                let mut out = Vec::new();
                for i in 0..list.GetCount()? {
                    let ctl = list.GetSession(i)?;
                    let Ok(ctl2) = ctl.cast::<IAudioSessionControl2>() else { continue };
                    let Ok(pid) = ctl2.GetProcessId() else { continue };
                    if pid == 0 {
                        continue;
                    }
                    if exe_name(pid).is_some_and(|exe| matches(source, &exe)) {
                        out.push(ctl.cast::<ISimpleAudioVolume>()?);
                    }
                }
                Ok(out)
            }
        }

        pub fn get(source: &str) -> Option<f32> {
            let v = volumes(source).ok()?;
            unsafe { v.first()?.GetMasterVolume().ok() }
        }

        pub fn set(source: &str, level: f32) -> Result<bool> {
            let v = volumes(source)?;
            for s in &v {
                unsafe { s.SetMasterVolume(level, std::ptr::null())? };
            }
            Ok(!v.is_empty())
        }
    }

    fn init() {
        // Idempotente por hilo; los comandos corren en hilos del pool bloqueante.
        unsafe {
            let _ = RoInitialize(RO_INIT_MULTITHREADED);
        }
    }

    fn is_playing(s: &Session) -> bool {
        s.GetPlaybackInfo()
            .and_then(|i| i.PlaybackStatus())
            .map(|st| st == Status::Playing)
            .unwrap_or(false)
    }

    fn session() -> Result<Option<Session>> {
        init();
        let mgr = Manager::RequestAsync()?.join()?;
        let list = mgr.GetSessions()?;
        let mut all = Vec::new();
        for i in 0..list.Size()? {
            all.push(list.GetAt(i)?);
        }
        if all.is_empty() {
            return Ok(mgr.GetCurrentSession().ok());
        }
        Ok(pick(all, is_playing, |s| s.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default()))
    }

    fn thumbnail(s: &Session) -> Option<String> {
        let props = s.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
        let stream = props.Thumbnail().ok()?.OpenReadAsync().ok()?.join().ok()?;
        let size = stream.Size().ok()? as u32;
        if size == 0 {
            return None;
        }
        let mime = stream.ContentType().map(|h| h.to_string()).unwrap_or_else(|_| "image/png".into());
        let reader = DataReader::CreateDataReader(&stream).ok()?;
        reader.LoadAsync(size).ok()?.join().ok()?;
        let mut buf = vec![0u8; size as usize];
        reader.ReadBytes(&mut buf).ok()?;
        Some(data_url(if mime.is_empty() { "image/png" } else { &mime }, &buf))
    }

    pub fn status() -> Result<Option<MediaInfo>> {
        let Some(s) = session()? else { return Ok(None) };
        let props = s.TryGetMediaPropertiesAsync()?.join()?;
        let info = s.GetPlaybackInfo()?;
        let controls = info.Controls()?;
        let title = props.Title()?.to_string();
        let artist = props.Artist()?.to_string();
        let source = s.SourceAppUserModelId()?.to_string();
        let art = art_cache::get_or(&format!("{source}|{title}|{artist}"), || thumbnail(&s));
        Ok(Some(MediaInfo {
            album: props.AlbumTitle()?.to_string(),
            playing: info.PlaybackStatus()? == Status::Playing,
            can_play_pause: controls.IsPlayPauseToggleEnabled()? || controls.IsPlayEnabled()? || controls.IsPauseEnabled()?,
            can_next: controls.IsNextEnabled()?,
            can_previous: controls.IsPreviousEnabled()?,
            title,
            artist,
            art,
            volume: mixer::get(&source),
            source,
        }))
    }

    pub fn set_volume(level: f32) -> Result<bool> {
        let Some(s) = session()? else { return Ok(false) };
        mixer::set(&s.SourceAppUserModelId()?.to_string(), level)
    }

    pub fn control(action: Action) -> Result<bool> {
        let Some(s) = session()? else { return Ok(false) };
        let op = match action {
            Action::Play => s.TryPlayAsync()?,
            Action::Pause => s.TryPauseAsync()?,
            Action::Toggle => s.TryTogglePlayPauseAsync()?,
            Action::Next => s.TrySkipNextAsync()?,
            Action::Previous => s.TrySkipPreviousAsync()?,
        };
        op.join()
    }
}

#[cfg(target_os = "linux")]
mod imp {
    use super::*;
    use std::collections::HashMap;
    use std::sync::OnceLock;
    use zbus::blocking::{fdo::DBusProxy, Connection, Proxy};
    use zbus::zvariant::OwnedValue;
    use zbus::Result;

    const PREFIX: &str = "org.mpris.MediaPlayer2.";

    fn conn() -> Result<&'static Connection> {
        static CONN: OnceLock<Connection> = OnceLock::new();
        if let Some(c) = CONN.get() {
            return Ok(c);
        }
        let c = Connection::session()?;
        Ok(CONN.get_or_init(|| c))
    }

    fn player(name: String) -> Result<Proxy<'static>> {
        Proxy::new(conn()?, name, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player")
    }

    fn session() -> Result<Option<(String, Proxy<'static>)>> {
        let names = DBusProxy::new(conn()?)?.list_names()?;
        let mut all = Vec::new();
        for n in names.into_iter().map(|n| n.to_string()).filter(|n| n.starts_with(PREFIX)) {
            all.push((n.clone(), player(n)?));
        }
        let playing = |(_, p): &(String, Proxy)| {
            p.get_property::<String>("PlaybackStatus").map(|s| s == "Playing").unwrap_or(false)
        };
        Ok(pick(all, playing, |(n, _)| n.clone()))
    }

    fn text(meta: &HashMap<String, OwnedValue>, key: &str) -> String {
        meta.get(key)
            .and_then(|v| v.try_clone().ok())
            .and_then(|v| String::try_from(v).ok())
            .unwrap_or_default()
    }

    fn art(url: &str) -> Option<String> {
        if url.starts_with("https://") || url.starts_with("http://") {
            return Some(url.to_string());
        }
        let path = url.strip_prefix("file://")?;
        let bytes = std::fs::read(path).ok()?;
        let mime = if path.ends_with(".png") { "image/png" } else { "image/jpeg" };
        Some(data_url(mime, &bytes))
    }

    pub fn status() -> Result<Option<MediaInfo>> {
        let Some((name, p)) = session()? else { return Ok(None) };
        let meta: HashMap<String, OwnedValue> = p.get_property("Metadata").unwrap_or_default();
        let artist = meta
            .get("xesam:artist")
            .and_then(|v| v.try_clone().ok())
            .and_then(|v| Vec::<String>::try_from(v).ok())
            .map(|a| a.join(", "))
            .unwrap_or_default();
        let title = text(&meta, "xesam:title");
        let art_url = text(&meta, "mpris:artUrl");
        let flag = |prop: &str| p.get_property::<bool>(prop).unwrap_or(false);
        Ok(Some(MediaInfo {
            album: text(&meta, "xesam:album"),
            playing: p.get_property::<String>("PlaybackStatus").map(|s| s == "Playing").unwrap_or(false),
            can_play_pause: flag("CanPlay") || flag("CanPause"),
            can_next: flag("CanGoNext"),
            can_previous: flag("CanGoPrevious"),
            art: art_cache::get_or(&art_url, || art(&art_url)),
            volume: p.get_property::<f64>("Volume").ok().map(|v| v.clamp(0.0, 1.0) as f32),
            source: name.trim_start_matches(PREFIX).to_string(),
            title,
            artist,
        }))
    }

    pub fn control(action: Action) -> Result<bool> {
        let Some((_, p)) = session()? else { return Ok(false) };
        let method = match action {
            Action::Play => "Play",
            Action::Pause => "Pause",
            Action::Toggle => "PlayPause",
            Action::Next => "Next",
            Action::Previous => "Previous",
        };
        p.call_method(method, &())?;
        Ok(true)
    }

    pub fn set_volume(level: f32) -> Result<bool> {
        let Some((_, p)) = session()? else { return Ok(false) };
        p.set_property("Volume", level as f64)?;
        Ok(true)
    }
}

#[cfg(not(any(windows, target_os = "linux")))]
mod imp {
    use super::*;
    pub fn status() -> Result<Option<MediaInfo>, String> {
        Ok(None)
    }
    pub fn control(_: Action) -> Result<bool, String> {
        Ok(false)
    }
    pub fn set_volume(_: f32) -> Result<bool, String> {
        Ok(false)
    }
}

#[tauri::command]
pub async fn media_status() -> Result<Option<MediaInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| imp::status().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn media_control(action: String) -> Result<bool, String> {
    let action = Action::parse(&action).ok_or_else(|| format!("acción desconocida: {action}"))?;
    tauri::async_runtime::spawn_blocking(move || imp::control(action).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn media_set_volume(volume: f32) -> Result<bool, String> {
    let level = if volume.is_finite() { volume.clamp(0.0, 1.0) } else { return Err("volumen inválido".into()) };
    tauri::async_runtime::spawn_blocking(move || imp::set_volume(level).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}
