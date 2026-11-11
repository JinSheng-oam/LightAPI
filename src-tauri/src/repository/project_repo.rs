use crate::domain::project::{CanonicalFolder, CanonicalProject};
use crate::error::CommandError;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};

pub struct ProjectRepository;

impl ProjectRepository {
    pub fn create_project(
        conn: &Connection,
        project: &CanonicalProject,
    ) -> Result<(), CommandError> {
        conn.execute(
            r#"
            INSERT INTO projects (id, name, description, source_format, source_file_hash, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                project.id,
                project.name,
                project.description,
                project.source_format,
                project.source_file_hash,
                project.created_at.to_rfc3339(),
                project.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn list_projects(conn: &Connection) -> Result<Vec<CanonicalProject>, CommandError> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, source_format, source_file_hash, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            let created_str: String = row.get(5)?;
            let updated_str: String = row.get(6)?;
            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(CanonicalProject {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                source_format: row.get(3)?,
                source_file_hash: row.get(4)?,
                created_at,
                updated_at,
            })
        })?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item?);
        }
        Ok(list)
    }

    pub fn get_project(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<CanonicalProject>, CommandError> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, source_format, source_file_hash, created_at, updated_at FROM projects WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let created_str: String = row.get(5)?;
            let updated_str: String = row.get(6)?;
            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(CanonicalProject {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                source_format: row.get(3)?,
                source_file_hash: row.get(4)?,
                created_at,
                updated_at,
            })
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn delete_project(conn: &Connection, id: &str) -> Result<(), CommandError> {
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn save_folder(conn: &Connection, folder: &CanonicalFolder) -> Result<(), CommandError> {
        conn.execute(
            r#"
            INSERT INTO folders (id, project_id, parent_id, name, sort_order, source_id)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
                parent_id = excluded.parent_id,
                name = excluded.name,
                sort_order = excluded.sort_order,
                source_id = excluded.source_id
            "#,
            params![
                folder.id,
                folder.project_id,
                folder.parent_id,
                folder.name,
                folder.sort_order,
                folder.source_id,
            ],
        )?;
        Ok(())
    }

    pub fn list_folders(
        conn: &Connection,
        project_id: &str,
    ) -> Result<Vec<CanonicalFolder>, CommandError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, parent_id, name, sort_order, source_id FROM folders WHERE project_id = ?1 ORDER BY sort_order ASC, name ASC",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            Ok(CanonicalFolder {
                id: row.get(0)?,
                project_id: row.get(1)?,
                parent_id: row.get(2)?,
                name: row.get(3)?,
                sort_order: row.get(4)?,
                source_id: row.get(5)?,
            })
        })?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item?);
        }
        Ok(list)
    }

    pub fn delete_folder(conn: &Connection, id: &str) -> Result<(), CommandError> {
        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
        Ok(())
    }
}
