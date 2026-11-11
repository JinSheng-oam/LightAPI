pub mod commands;
pub mod domain;
pub mod error;
pub mod http;
pub mod importer;
pub mod repository;

use repository::Database;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = app_data_dir.join("lightapi.db");
            let db = Database::new_at_path(&db_path)
                .unwrap_or_else(|_| Database::new_in_memory().expect("fallback in memory"));
            let http = http::HttpEngine::new();

            app.manage(commands::AppState {
                db: Arc::new(db),
                http: Arc::new(http),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_project,
            commands::list_projects,
            commands::delete_project,
            commands::list_folders,
            commands::save_folder,
            commands::delete_folder,
            commands::list_requests,
            commands::save_request,
            commands::delete_request,
            commands::list_environments,
            commands::save_environment,
            commands::delete_environment,
            commands::execute_request,
            commands::list_history,
            commands::clear_history,
            commands::preview_import,
            commands::commit_import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running lightapi application");
}
