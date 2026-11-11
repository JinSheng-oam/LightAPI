use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
    Custom(String),
}

impl HttpMethod {
    pub fn as_str(&self) -> &str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
            HttpMethod::Patch => "PATCH",
            HttpMethod::Head => "HEAD",
            HttpMethod::Options => "OPTIONS",
            HttpMethod::Custom(s) => s.as_str(),
        }
    }

    pub fn from_str_loose(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "GET" => HttpMethod::Get,
            "POST" => HttpMethod::Post,
            "PUT" => HttpMethod::Put,
            "DELETE" => HttpMethod::Delete,
            "PATCH" => HttpMethod::Patch,
            "HEAD" => HttpMethod::Head,
            "OPTIONS" => HttpMethod::Options,
            _ => HttpMethod::Custom(s.to_uppercase()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParamItem {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub description: Option<String>,
    pub param_type: String, // "query", "path", "header"
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HeaderItem {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum BodyMode {
    None,
    RawJson,
    RawText,
    Urlencoded,
    FormData,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FormDataItem {
    pub key: String,
    pub value: String,
    pub item_type: String, // "text" or "file"
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RequestBody {
    pub mode: BodyMode,
    pub raw: Option<String>,
    pub form_data: Vec<FormDataItem>,
}

impl Default for RequestBody {
    fn default() -> Self {
        Self {
            mode: BodyMode::None,
            raw: None,
            form_data: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AuthType {
    None,
    Bearer,
    Basic,
    ApiKey,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RequestAuth {
    pub auth_type: AuthType,
    pub token: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub key: Option<String>,
    pub value: Option<String>,
    pub add_to: Option<String>, // "header" or "query"
}

impl Default for RequestAuth {
    fn default() -> Self {
        Self {
            auth_type: AuthType::None,
            token: None,
            username: None,
            password: None,
            key: None,
            value: None,
            add_to: Some("header".to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CanonicalRequest {
    pub id: String,
    pub project_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: HttpMethod,
    pub path: String,
    pub description: Option<String>,
    pub params: Vec<ParamItem>,
    pub headers: Vec<HeaderItem>,
    pub body: RequestBody,
    pub auth: RequestAuth,
    pub source_id: Option<String>,
    pub source_fingerprint: Option<String>,
    pub locally_modified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl CanonicalRequest {
    pub fn new(
        project_id: impl Into<String>,
        name: impl Into<String>,
        method: HttpMethod,
        path: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.into(),
            folder_id: None,
            name: name.into(),
            method,
            path: path.into(),
            description: None,
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBody::default(),
            auth: RequestAuth::default(),
            source_id: None,
            source_fingerprint: None,
            locally_modified: false,
            created_at: now,
            updated_at: now,
        }
    }
}
