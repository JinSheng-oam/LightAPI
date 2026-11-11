use crate::domain::environment::{BaseUrlItem, Environment, Variable};
use crate::error::CommandError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct EnvConfigData {
    pub base_urls: Vec<BaseUrlItem>,
    pub variables: Vec<Variable>,
}

pub struct EnvironmentRepository;

impl EnvironmentRepository {
    pub fn save_environment(conn: &Connection, env: &Environment) -> Result<(), CommandError> {
        let config = EnvConfigData {
            base_urls: env.base_urls.clone(),
            variables: env.variables.clone(),
        };
        let config_json = serde_json::to_string(&config)?;

        conn.execute(
            r#"
            INSERT INTO environments (id, project_id, name, config_json, is_production)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                config_json = excluded.config_json,
                is_production = excluded.is_production
            "#,
            params![
                env.id,
                env.project_id,
                env.name,
                config_json,
                if env.is_production { 1 } else { 0 },
            ],
        )?;
        Ok(())
    }

    pub fn list_environments(
        conn: &Connection,
        project_id: &str,
    ) -> Result<Vec<Environment>, CommandError> {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, config_json, is_production FROM environments WHERE project_id = ?1 ORDER BY name ASC",
        )?;
        let rows = stmt.query_map(params![project_id], |row| {
            let config_json: String = row.get(3)?;
            let is_production: i32 = row.get(4)?;

            let config: EnvConfigData =
                serde_json::from_str(&config_json).unwrap_or(EnvConfigData {
                    base_urls: Vec::new(),
                    variables: Vec::new(),
                });

            Ok(Environment {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                base_urls: config.base_urls,
                variables: config.variables,
                is_production: is_production != 0,
            })
        })?;

        let mut list = Vec::new();
        for item in rows {
            list.push(item?);
        }
        Ok(list)
    }

    pub fn delete_environment(conn: &Connection, id: &str) -> Result<(), CommandError> {
        conn.execute("DELETE FROM environments WHERE id = ?1", params![id])?;
        Ok(())
    }
}
