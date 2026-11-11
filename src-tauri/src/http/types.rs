use crate::domain::request::{HeaderItem, HttpMethod, ParamItem, RequestAuth, RequestBody};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRequestInput {
    pub execution_id: Option<String>,
    pub url: String,
    pub method: HttpMethod,
    pub params: Vec<ParamItem>,
    pub headers: Vec<HeaderItem>,
    pub body: RequestBody,
    pub auth: RequestAuth,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteResponseOutput {
    pub status: u16,
    pub status_text: String,
    pub duration_ms: u128,
    pub size_bytes: usize,
    pub headers: Vec<(String, String)>,
    pub body_preview: String,
    pub body_truncated: bool,
    pub content_type: Option<String>,
    pub redacted_url: String,
}
