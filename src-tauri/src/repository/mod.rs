pub mod env_repo;
pub mod history_repo;
pub mod migrations;
pub mod project_repo;
pub mod request_repo;

pub use env_repo::EnvironmentRepository;
pub use history_repo::HistoryRepository;
pub use project_repo::ProjectRepository;
pub use request_repo::RequestRepository;

use crate::error::CommandError;
use rusqlite::Connection;
use std::path::Path;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new_in_memory() -> Result<Self, CommandError> {
        let mut conn = Connection::open_in_memory()?;
        migrations::run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn new_at_path(path: &Path) -> Result<Self, CommandError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                CommandError::database_error(format!("Failed to create db dir: {}", e))
            })?;
        }
        let mut conn = Connection::open(path)?;
        migrations::run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn with_conn<F, R>(&self, f: F) -> Result<R, CommandError>
    where
        F: FnOnce(&Connection) -> Result<R, CommandError>,
    {
        let conn = self
            .conn
            .lock()
            .map_err(|_| CommandError::database_error("Database lock poisoned"))?;
        f(&conn)
    }

    pub fn with_mut_conn<F, R>(&self, f: F) -> Result<R, CommandError>
    where
        F: FnOnce(&mut Connection) -> Result<R, CommandError>,
    {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| CommandError::database_error("Database lock poisoned"))?;
        f(&mut conn)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::environment::Environment;
    use crate::domain::history::RequestHistory;
    use crate::domain::project::{CanonicalFolder, CanonicalProject};
    use crate::domain::request::{CanonicalRequest, HttpMethod};

    #[test]
    fn test_database_crud_and_history_trim() {
        let db = Database::new_in_memory().expect("init in memory db");

        // 1. Project CRUD
        let project = CanonicalProject::new("测试电商项目");
        db.with_conn(|conn| ProjectRepository::create_project(conn, &project))
            .expect("create project");

        let projects = db
            .with_conn(ProjectRepository::list_projects)
            .expect("list projects");
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "测试电商项目");

        // 2. Folder CRUD
        let folder = CanonicalFolder::new(&project.id, "用户模块");
        db.with_conn(|conn| ProjectRepository::save_folder(conn, &folder))
            .expect("save folder");
        let folders = db
            .with_conn(|conn| ProjectRepository::list_folders(conn, &project.id))
            .expect("list folders");
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].name, "用户模块");

        // 3. Request CRUD
        let mut req =
            CanonicalRequest::new(&project.id, "用户登录", HttpMethod::Post, "/api/login");
        req.folder_id = Some(folder.id.clone());
        db.with_conn(|conn| RequestRepository::save_request(conn, &req))
            .expect("save request");

        let loaded_req = db
            .with_conn(|conn| RequestRepository::get_request(conn, &req.id))
            .expect("get request")
            .expect("found request");
        assert_eq!(loaded_req.name, "用户登录");
        assert_eq!(loaded_req.method, HttpMethod::Post);
        assert_eq!(loaded_req.folder_id.as_deref(), Some(folder.id.as_str()));

        // 4. Environment CRUD
        let env = Environment::new(&project.id, "测试环境", false);
        db.with_conn(|conn| EnvironmentRepository::save_environment(conn, &env))
            .expect("save env");
        let envs = db
            .with_conn(|conn| EnvironmentRepository::list_environments(conn, &project.id))
            .expect("list envs");
        assert_eq!(envs.len(), 1);
        assert_eq!(envs[0].name, "测试环境");

        // 5. History and Trim test
        for i in 0..10 {
            let hist = RequestHistory::new(
                &project.id,
                &req.id,
                "POST",
                200,
                50 + i as u128,
                1024,
                "http://localhost:8080/api/login",
            );
            db.with_conn(|conn| HistoryRepository::save_history(conn, &hist))
                .expect("save history");
        }

        let history_list = db
            .with_conn(|conn| HistoryRepository::list_history(conn, &project.id, 5))
            .expect("list history limit 5");
        assert_eq!(history_list.len(), 5);

        // 6. Delete Project (Cascades to requests, folders, envs, history)
        db.with_conn(|conn| ProjectRepository::delete_project(conn, &project.id))
            .expect("delete project");
        let empty_projects = db
            .with_conn(ProjectRepository::list_projects)
            .expect("list projects");
        assert_eq!(empty_projects.len(), 0);

        let empty_requests = db
            .with_conn(|conn| RequestRepository::list_requests(conn, &project.id))
            .expect("list requests");
        assert_eq!(empty_requests.len(), 0);
    }
}
