use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(
        code: impl Into<String>,
        message: impl Into<String>,
        details: serde_json::Value,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: Some(details),
        }
    }

    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::new("BAD_REQUEST", msg)
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::new("NOT_FOUND", msg)
    }

    pub fn database_error(msg: impl Into<String>) -> Self {
        Self::new("DATABASE_ERROR", msg)
    }

    pub fn http_error(msg: impl Into<String>) -> Self {
        Self::new("HTTP_ERROR", msg)
    }

    pub fn import_error(msg: impl Into<String>) -> Self {
        Self::new("IMPORT_ERROR", msg)
    }
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}]: {}", self.code, self.message)
    }
}

impl From<rusqlite::Error> for CommandError {
    fn from(err: rusqlite::Error) -> Self {
        Self::database_error(err.to_string())
    }
}

impl From<serde_json::Error> for CommandError {
    fn from(err: serde_json::Error) -> Self {
        Self::bad_request(format!("JSON serialization error: {}", err))
    }
}

impl From<reqwest::Error> for CommandError {
    fn from(err: reqwest::Error) -> Self {
        Self::http_error(err.to_string())
    }
}
