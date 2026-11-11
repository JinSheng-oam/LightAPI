use crate::domain::history::RequestHistory;
use crate::error::CommandError;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};

pub struct HistoryRepository;

impl HistoryRepository {
    pub const DEFAULT_MAX_HISTORY: usize = 500;

    pub fn save_history(conn: &Connection, history: &RequestHistory) -> Result<(), CommandError> {
        conn.execute(
            r#"
            INSERT INTO request_history (
                id, project_id, request_id, environment_id, requested_at,
                method, status, duration_ms, size_bytes, url_redacted, error_code
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                history.id,
                history.project_id,
                history.request_id,
                history.environment_id,
                history.requested_at.to_rfc3339(),
                history.method,
                history.status,
                history.duration_ms as i64,
                history.size_bytes as i64,
                history.url_redacted,
                history.error_code,
            ],
        )?;

        // Auto-trim history beyond limit per project
        conn.execute(
            r#"
            DELETE FROM request_history
            WHERE id IN (
                SELECT id FROM request_history
                WHERE project_id = ?1
                ORDER BY requested_at DESC
                LIMIT -1 OFFSET ?2
            )
            "#,
            params![history.project_id, Self::DEFAULT_MAX_HISTORY as i64],
        )?;

        Ok(())
    }

    pub fn list_history(
        conn: &Connection,
        project_id: &str,
        limit: usize,
    ) -> Result<Vec<RequestHistory>, CommandError> {
        let mut stmt = conn.prepare(
            r#"
            SELECT id, project_id, request_id, environment_id, requested_at,
                   method, status, duration_ms, size_bytes, url_redacted, error_code
            FROM request_history
            WHERE project_id = ?1
            ORDER BY requested_at DESC
            LIMIT ?2
            "#,
        )?;
        let rows = stmt.query_map(params![project_id, limit as i64], |row| {
            let requested_str: String = row.get(4)?;
            let requested_at = DateTime::parse_from_rfc3339(&requested_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let duration_ms: i64 = row.get(7)?;
            let size_bytes: i64 = row.get(8)?;

            Ok(RequestHistory {
                id: row.get(0)?,
                project_id: row.get(1)?,
                request_id: row.get(2)?,
                environment_id: row.get(3)?,
                requested_at,
                method: row.get(5)?,
                status: row.get(6)?,
                duration_ms: duration_ms as u128,
                size_bytes: size_bytes as usize,
                url_redacted: row.get(9)?,
                error_code: row.get(10)?,
            })
        })?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item?);
        }
        Ok(list)
    }

    pub fn clear_history(conn: &Connection, project_id: &str) -> Result<(), CommandError> {
        conn.execute(
            "DELETE FROM request_history WHERE project_id = ?1",
            params![project_id],
        )?;
        Ok(())
    }
}
