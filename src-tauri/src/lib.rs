use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WindowEvent, Wry};

mod media;

const TRAY_ID: &str = "main";

/// Estado compartido con el frontend.
struct DesktopState {
    close_to_tray: AtomicBool,
    toggle_item: Mutex<Option<MenuItem<Wry>>>,
}

/// Muestra la ventana principal. La mini ventana solo existe mientras la principal está oculta,
/// así que se cierra.
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    if let Some(mini) = app.get_webview_window("mini") {
        let _ = mini.close();
    }
}

/// El frontend lo llama en cada cambio del temporizador.
#[tauri::command]
fn update_tray(app: AppHandle, state: tauri::State<DesktopState>, tooltip: String, toggle_label: String) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_tooltip(Some(&tooltip));
    }
    if let Some(item) = state.toggle_item.lock().unwrap().as_ref() {
        let _ = item.set_text(toggle_label);
    }
}

#[tauri::command]
fn set_close_to_tray(state: tauri::State<DesktopState>, enabled: bool) {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    show_main(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ));
    }

    builder
        .manage(DesktopState {
            close_to_tray: AtomicBool::new(true),
            toggle_item: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            update_tray,
            set_close_to_tray,
            show_main_window,
            media::media_status,
            media::media_control,
            media::media_set_volume
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Mostrar Brote", true, None::<&str>)?;
            let toggle = MenuItem::with_id(app, "toggle", "Plantar", true, None::<&str>)?;
            let mini = MenuItem::with_id(app, "mini", "Mini ventana", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&show, &toggle, &mini, &PredefinedMenuItem::separator(app)?, &quit],
            )?;
            *app.state::<DesktopState>().toggle_item.lock().unwrap() = Some(toggle);

            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Brote")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main(app),
                    "quit" => app.exit(0),
                    // El resto lo resuelve el frontend, que es dueño del estado.
                    other => {
                        let _ = app.emit_to("main", "tray", other.to_string());
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // Lanzado por el autoarranque: empezar en la bandeja.
            if std::env::args().any(|a| a == "--minimized") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<DesktopState>();
                if window.label() == "main" && state.close_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Brote");
}
