use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Variable {
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub enabled: bool,
    pub description: Option<String>,
}

impl Variable {
    pub fn new(key: impl Into<String>, value: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            value: value.into(),
            is_secret: false,
            enabled: true,
            description: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BaseUrlItem {
    pub key: String, // e.g. "default", "authService"
    pub url: String, // e.g. "https://api.example.com"
    pub description: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Environment {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub base_urls: Vec<BaseUrlItem>,
    pub variables: Vec<Variable>,
    pub is_production: bool,
}

impl Environment {
    pub fn new(
        project_id: impl Into<String>,
        name: impl Into<String>,
        is_production: bool,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.into(),
            name: name.into(),
            base_urls: vec![BaseUrlItem {
                key: "default".to_string(),
                url: "http://localhost:8080".to_string(),
                description: Some("默认服务前置地址".to_string()),
                enabled: true,
            }],
            variables: Vec::new(),
            is_production,
        }
    }
}
