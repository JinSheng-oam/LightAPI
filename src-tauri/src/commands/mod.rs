use crate::domain::environment::Environment;
use crate::domain::history::RequestHistory;
use crate::domain::importer::{ImportPreview, ImportReport};
use crate::domain::project::{CanonicalFolder, CanonicalProject};
use crate::domain::request::CanonicalRequest;
use crate::error::CommandError;
use crate::http::{ExecuteRequestInput, ExecuteResponseOutput, HttpEngine};
use crate::importer::ImporterPipeline;
use crate::repository::{
    Database, EnvironmentRepository, HistoryRepository, ProjectRepository, RequestRepository,
};
use std::sync::Arc;
use tauri::State;

pub struct AppState {
    pub db: Arc<Database>,
    pub http: Arc<HttpEngine>,
}

// ----------------- Project & Folder Commands -----------------

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    name: String,
) -> Result<CanonicalProject, CommandError> {
    let name_trimmed = name.trim();
    if name_trimmed.is_empty() {
        return Err(CommandError::bad_request("项目名称不能为空"));
    }
    let project = CanonicalProject::new(name_trimmed);
    let default_env = Environment::new(&project.id, "开发环境", false);

    let db = state.db.clone();
    let p_clone = project.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| {
            ProjectRepository::create_project(conn, &p_clone)?;
            EnvironmentRepository::save_environment(conn, &default_env)?;
            Ok(())
        })
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))??;

    Ok(project)
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
) -> Result<Vec<CanonicalProject>, CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || db.with_conn(ProjectRepository::list_projects))
        .await
        .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| ProjectRepository::delete_project(conn, &id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn list_folders(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<CanonicalFolder>, CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| ProjectRepository::list_folders(conn, &project_id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn save_folder(
    state: State<'_, AppState>,
    folder: CanonicalFolder,
) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| ProjectRepository::save_folder(conn, &folder))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn delete_folder(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| ProjectRepository::delete_folder(conn, &id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

// ----------------- Request Commands -----------------

#[tauri::command]
pub async fn list_requests(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<CanonicalRequest>, CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| RequestRepository::list_requests(conn, &project_id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn save_request(
    state: State<'_, AppState>,
    mut request: CanonicalRequest,
) -> Result<CanonicalRequest, CommandError> {
    request.updated_at = chrono::Utc::now();
    let db = state.db.clone();
    let r_clone = request.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| RequestRepository::save_request(conn, &r_clone))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))??;

    Ok(request)
}

#[tauri::command]
pub async fn delete_request(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| RequestRepository::delete_request(conn, &id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

// ----------------- Environment Commands -----------------

#[tauri::command]
pub async fn list_environments(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<Environment>, CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| EnvironmentRepository::list_environments(conn, &project_id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn save_environment(
    state: State<'_, AppState>,
    env: Environment,
) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| EnvironmentRepository::save_environment(conn, &env))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn delete_environment(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| EnvironmentRepository::delete_environment(conn, &id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

// ----------------- HTTP Execution Commands -----------------

#[tauri::command]
pub async fn execute_request(
    state: State<'_, AppState>,
    project_id: Option<String>,
    request_id: Option<String>,
    environment_id: Option<String>,
    input: ExecuteRequestInput,
) -> Result<ExecuteResponseOutput, CommandError> {
    let response = state.http.execute(input.clone()).await?;

    // Persist to history if project_id and request_id are present
    if let (Some(pid), Some(rid)) = (project_id, request_id) {
        let history = RequestHistory {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: pid,
            request_id: rid,
            environment_id,
            requested_at: chrono::Utc::now(),
            method: input.method.as_str().to_string(),
            status: response.status,
            duration_ms: response.duration_ms,
            size_bytes: response.size_bytes,
            url_redacted: response.redacted_url.clone(),
            error_code: None,
        };

        let db = state.db.clone();
        tokio::task::spawn_blocking(move || {
            let _ = db.with_conn(|conn| HistoryRepository::save_history(conn, &history));
        });
    }

    Ok(response)
}

#[tauri::command]
pub async fn list_history(
    state: State<'_, AppState>,
    project_id: String,
    limit: Option<usize>,
) -> Result<Vec<RequestHistory>, CommandError> {
    let db = state.db.clone();
    let count = limit.unwrap_or(50);
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| HistoryRepository::list_history(conn, &project_id, count))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

#[tauri::command]
pub async fn clear_history(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<(), CommandError> {
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| HistoryRepository::clear_history(conn, &project_id))
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))?
}

// ----------------- Importer Commands -----------------

#[tauri::command]
pub async fn preview_import(
    content: String,
    file_name: String,
) -> Result<ImportPreview, CommandError> {
    tokio::task::spawn_blocking(move || ImporterPipeline::preview(&content, &file_name))
        .await
        .map_err(|e| CommandError::import_error(e.to_string()))?
}

#[tauri::command]
pub async fn commit_import(
    state: State<'_, AppState>,
    content: String,
    file_name: String,
) -> Result<ImportReport, CommandError> {
    let bundle = tokio::task::spawn_blocking(move || ImporterPipeline::parse(&content, &file_name))
        .await
        .map_err(|e| CommandError::import_error(e.to_string()))??;

    let db = state.db.clone();
    let total = bundle.requests.len();
    let detected_format = bundle.project.source_format.clone().unwrap_or_default();
    let warnings = bundle.warnings.clone();

    tokio::task::spawn_blocking(move || {
        db.with_conn(|conn| {
            // Write in SQLite transaction
            ProjectRepository::create_project(conn, &bundle.project)?;
            for folder in &bundle.folders {
                ProjectRepository::save_folder(conn, folder)?;
            }
            for env in &bundle.environments {
                EnvironmentRepository::save_environment(conn, env)?;
            }
            for req in &bundle.requests {
                RequestRepository::save_request(conn, req)?;
            }
            Ok(())
        })
    })
    .await
    .map_err(|e| CommandError::database_error(e.to_string()))??;

    Ok(ImportReport {
        detected_format,
        total,
        imported: total,
        updated: 0,
        skipped: 0,
        warnings,
    })
}
