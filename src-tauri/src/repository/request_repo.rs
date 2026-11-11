use crate::domain::request::{
    CanonicalRequest, HeaderItem, HttpMethod, ParamItem, RequestAuth, RequestBody,
};
use crate::error::CommandError;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct RequestConfigData {
    pub description: Option<String>,
    pub params: Vec<ParamItem>,
    pub headers: Vec<HeaderItem>,
    pub body: RequestBody,
    pub auth: RequestAuth,
}

pub struct RequestRepository;

impl RequestRepository {
    pub fn save_request(conn: &Connection, req: &CanonicalRequest) -> Result<(), CommandError> {
        let config = RequestConfigData {
            description: req.description.clone(),
            params: req.params.clone(),
            headers: req.headers.clone(),
            body: req.body.clone(),
            auth: req.auth.clone(),
        };
        let config_json = serde_json::to_string(&config)?;

        conn.execute(
            r#"
            INSERT INTO requests (
                id, project_id, folder_id, name, method, path, config_json,
                source_id, source_fingerprint, locally_modified, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            ON CONFLICT(id) DO UPDATE SET
                folder_id = excluded.folder_id,
                name = excluded.name,
                method = excluded.method,
                path = excluded.path,
                config_json = excluded.config_json,
                source_id = excluded.source_id,
                source_fingerprint = excluded.source_fingerprint,
                locally_modified = excluded.locally_modified,
                updated_at = excluded.updated_at
            "#,
            params![
                req.id,
                req.project_id,
                req.folder_id,
                req.name,
                req.method.as_str(),
                req.path,
                config_json,
                req.source_id,
                req.source_fingerprint,
                if req.locally_modified { 1 } else { 0 },
                req.created_at.to_rfc3339(),
                req.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_request(
        conn: &Connection,
        id: &str,
    ) -> Result<Option<CanonicalRequest>, CommandError> {
        let mut stmt = conn.prepare(
            r#"
            SELECT id, project_id, folder_id, name, method, path, config_json,
                   source_id, source_fingerprint, locally_modified, created_at, updated_at
            FROM requests WHERE id = ?1
            "#,
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            let method_str: String = row.get(4)?;
            let config_json: String = row.get(6)?;
            let locally_modified: i32 = row.get(9)?;
            let created_str: String = row.get(10)?;
            let updated_str: String = row.get(11)?;

            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let config: RequestConfigData =
                serde_json::from_str(&config_json).unwrap_or(RequestConfigData {
                    description: None,
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBody::default(),
                    auth: RequestAuth::default(),
                });

            Ok(CanonicalRequest {
                id: row.get(0)?,
                project_id: row.get(1)?,
                folder_id: row.get(2)?,
                name: row.get(3)?,
                method: HttpMethod::from_str_loose(&method_str),
                path: row.get(5)?,
                description: config.description,
                params: config.params,
                headers: config.headers,
                body: config.body,
                auth: config.auth,
                source_id: row.get(7)?,
                source_fingerprint: row.get(8)?,
                locally_modified: locally_modified != 0,
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

    pub fn list_requests(
        conn: &Connection,
        project_id: &str,
    ) -> Result<Vec<CanonicalRequest>, CommandError> {
        let mut stmt = conn.prepare(
            r#"
            SELECT id, project_id, folder_id, name, method, path, config_json,
                   source_id, source_fingerprint, locally_modified, created_at, updated_at
            FROM requests WHERE project_id = ?1 ORDER BY name ASC
            "#,
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            let method_str: String = row.get(4)?;
            let config_json: String = row.get(6)?;
            let locally_modified: i32 = row.get(9)?;
            let created_str: String = row.get(10)?;
            let updated_str: String = row.get(11)?;

            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let config: RequestConfigData =
                serde_json::from_str(&config_json).unwrap_or(RequestConfigData {
                    description: None,
                    params: Vec::new(),
                    headers: Vec::new(),
                    body: RequestBody::default(),
                    auth: RequestAuth::default(),
                });

            Ok(CanonicalRequest {
                id: row.get(0)?,
                project_id: row.get(1)?,
                folder_id: row.get(2)?,
                name: row.get(3)?,
                method: HttpMethod::from_str_loose(&method_str),
                path: row.get(5)?,
                description: config.description,
                params: config.params,
                headers: config.headers,
                body: config.body,
                auth: config.auth,
                source_id: row.get(7)?,
                source_fingerprint: row.get(8)?,
                locally_modified: locally_modified != 0,
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

    pub fn delete_request(conn: &Connection, id: &str) -> Result<(), CommandError> {
        conn.execute("DELETE FROM requests WHERE id = ?1", params![id])?;
        Ok(())
    }
}
