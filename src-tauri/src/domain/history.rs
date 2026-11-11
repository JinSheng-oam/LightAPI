use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RequestHistory {
    pub id: String,
    pub project_id: String,
    pub request_id: String,
    pub environment_id: Option<String>,
    pub requested_at: DateTime<Utc>,
    pub method: String,
    pub status: u16,
    pub duration_ms: u128,
    pub size_bytes: usize,
    pub url_redacted: String,
    pub error_code: Option<String>,
}

impl RequestHistory {
    pub fn new(
        project_id: impl Into<String>,
        request_id: impl Into<String>,
        method: impl Into<String>,
        status: u16,
        duration_ms: u128,
        size_bytes: usize,
        url_redacted: impl Into<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.into(),
            request_id: request_id.into(),
            environment_id: None,
            requested_at: Utc::now(),
            method: method.into(),
            status,
            duration_ms,
            size_bytes,
            url_redacted: url_redacted.into(),
            error_code: None,
        }
    }
}
