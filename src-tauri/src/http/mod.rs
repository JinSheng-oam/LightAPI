pub mod executor;
pub mod redactor;
pub mod types;

pub use executor::HttpExecutor;
pub use redactor::Redactor;
pub use types::{ExecuteRequestInput, ExecuteResponseOutput};

use crate::error::CommandError;
use reqwest::redirect::Policy;
use std::time::Duration;

#[derive(Clone)]
pub struct HttpEngine {
    client: reqwest::Client,
}

impl Default for HttpEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl HttpEngine {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .redirect(Policy::limited(10))
            .build()
            .expect("Failed to build reqwest HTTP client");

        Self { client }
    }

    pub async fn execute(
        &self,
        input: ExecuteRequestInput,
    ) -> Result<ExecuteResponseOutput, CommandError> {
        HttpExecutor::execute(&self.client, input).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::request::{
        AuthType, BodyMode, HeaderItem, HttpMethod, ParamItem, RequestAuth, RequestBody,
    };
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn test_http_get_and_post_execution() {
        let mock_server = MockServer::start().await;

        // 1. Mock GET /api/users
        Mock::given(method("GET"))
            .and(path("/api/users"))
            .and(header("x-custom-trace", "trace-123"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({"users": ["Alice", "Bob"]})),
            )
            .mount(&mock_server)
            .await;

        let engine = HttpEngine::new();

        let get_input = ExecuteRequestInput {
            execution_id: None,
            url: format!("{}/api/users", mock_server.uri()),
            method: HttpMethod::Get,
            params: vec![ParamItem {
                key: "limit".to_string(),
                value: "10".to_string(),
                enabled: true,
                description: None,
                param_type: "query".to_string(),
            }],
            headers: vec![HeaderItem {
                key: "x-custom-trace".to_string(),
                value: "trace-123".to_string(),
                enabled: true,
                description: None,
            }],
            body: RequestBody::default(),
            auth: RequestAuth::default(),
            timeout_ms: Some(5000),
        };

        let get_resp = engine
            .execute(get_input)
            .await
            .expect("GET request success");
        assert_eq!(get_resp.status, 200);
        assert!(get_resp.body_preview.contains("Alice"));
        assert!(get_resp.redacted_url.contains("limit=10"));

        // 2. Mock POST /api/login with Bearer Token and JSON Body
        Mock::given(method("POST"))
            .and(path("/api/login"))
            .and(header("authorization", "Bearer my-secret-token"))
            .respond_with(
                ResponseTemplate::new(201)
                    .set_body_json(serde_json::json!({"status": "created", "id": 42})),
            )
            .mount(&mock_server)
            .await;

        let post_input = ExecuteRequestInput {
            execution_id: None,
            url: format!("{}/api/login", mock_server.uri()),
            method: HttpMethod::Post,
            params: Vec::new(),
            headers: Vec::new(),
            body: RequestBody {
                mode: BodyMode::RawJson,
                raw: Some(r#"{"username":"testuser"}"#.to_string()),
                form_data: Vec::new(),
            },
            auth: RequestAuth {
                auth_type: AuthType::Bearer,
                token: Some("my-secret-token".to_string()),
                username: None,
                password: None,
                key: None,
                value: None,
                add_to: Some("header".to_string()),
            },
            timeout_ms: Some(5000),
        };

        let post_resp = engine
            .execute(post_input)
            .await
            .expect("POST request success");
        assert_eq!(post_resp.status, 201);
        assert!(post_resp.body_preview.contains("created"));
    }
}
