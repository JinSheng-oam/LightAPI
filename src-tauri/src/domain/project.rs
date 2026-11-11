use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CanonicalProject {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_format: Option<String>,
    pub source_file_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl CanonicalProject {
    pub fn new(name: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.into(),
            description: None,
            source_format: None,
            source_file_hash: None,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CanonicalFolder {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i32,
    pub source_id: Option<String>,
}

impl CanonicalFolder {
    pub fn new(project_id: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.into(),
            parent_id: None,
            name: name.into(),
            sort_order: 0,
            source_id: None,
        }
    }
}
