use super::environment::Environment;
use super::project::{CanonicalFolder, CanonicalProject};
use super::request::CanonicalRequest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportWarning {
    pub code: String,
    pub message: String,
    pub location: Option<String>,
}

impl ImportWarning {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            location: None,
        }
    }

    pub fn with_location(
        code: impl Into<String>,
        message: impl Into<String>,
        location: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            location: Some(location.into()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportPreview {
    pub detected_format: String,
    pub project_name: String,
    pub request_count: usize,
    pub folder_count: usize,
    pub environment_count: usize,
    pub warnings: Vec<ImportWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportReport {
    pub detected_format: String,
    pub total: usize,
    pub imported: usize,
    pub updated: usize,
    pub skipped: usize,
    pub warnings: Vec<ImportWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedProjectBundle {
    pub project: CanonicalProject,
    pub folders: Vec<CanonicalFolder>,
    pub requests: Vec<CanonicalRequest>,
    pub environments: Vec<Environment>,
    pub warnings: Vec<ImportWarning>,
}
