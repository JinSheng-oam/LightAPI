use super::redactor::Redactor;
use super::types::{ExecuteRequestInput, ExecuteResponseOutput};
use crate::domain::request::{AuthType, BodyMode, HttpMethod};
use crate::error::CommandError;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use std::str::FromStr;
use std::time::{Duration, Instant};

pub struct HttpExecutor;

impl HttpExecutor {
    pub const MAX_PREVIEW_BYTES: usize = 1024 * 1024; // 1 MB limit for frontend preview

    pub async fn execute(
        client: &reqwest::Client,
        input: ExecuteRequestInput,
    ) -> Result<ExecuteResponseOutput, CommandError> {
        let mut target_url = input.url.trim().to_string();

        // 1. Path parameters substitution e.g. :id or {id}
        for p in input
            .params
            .iter()
            .filter(|p| p.enabled && p.param_type == "path")
        {
            let colon_pattern = format!(":{}", p.key);
            let brace_pattern = format!("{{{}}}", p.key);
            target_url = target_url.replace(&colon_pattern, &p.value);
            target_url = target_url.replace(&brace_pattern, &p.value);
        }

        let mut parsed_url = url::Url::parse(&target_url).map_err(|e| {
            CommandError::bad_request(format!("Invalid request URL '{}': {}", target_url, e))
        })?;

        // 2. Query parameters
        for p in input
            .params
            .iter()
            .filter(|p| p.enabled && p.param_type == "query")
        {
            parsed_url.query_pairs_mut().append_pair(&p.key, &p.value);
        }

        // 3. API Key in query parameter if configured
        if input.auth.auth_type == AuthType::ApiKey && input.auth.add_to.as_deref() == Some("query")
        {
            if let (Some(k), Some(v)) = (&input.auth.key, &input.auth.value) {
                parsed_url.query_pairs_mut().append_pair(k, v);
            }
        }

        let final_url_str = parsed_url.to_string();
        let redacted_url = Redactor::redact_url(&final_url_str);

        // 4. Determine reqwest method
        let method = match &input.method {
            HttpMethod::Get => reqwest::Method::GET,
            HttpMethod::Post => reqwest::Method::POST,
            HttpMethod::Put => reqwest::Method::PUT,
            HttpMethod::Delete => reqwest::Method::DELETE,
            HttpMethod::Patch => reqwest::Method::PATCH,
            HttpMethod::Head => reqwest::Method::HEAD,
            HttpMethod::Options => reqwest::Method::OPTIONS,
            HttpMethod::Custom(name) => {
                reqwest::Method::from_bytes(name.as_bytes()).map_err(|e| {
                    CommandError::bad_request(format!("Invalid HTTP method '{}': {}", name, e))
                })?
            }
        };

        let mut req_builder = client.request(method, parsed_url);

        // 5. Timeout
        if let Some(timeout_ms) = input.timeout_ms {
            req_builder = req_builder.timeout(Duration::from_millis(timeout_ms));
        }

        // 6. Headers
        let mut header_map = HeaderMap::new();
        for h in input
            .headers
            .iter()
            .filter(|h| h.enabled && !h.key.trim().is_empty())
        {
            if let (Ok(name), Ok(val)) = (
                HeaderName::from_str(h.key.trim()),
                HeaderValue::from_str(&h.value),
            ) {
                header_map.insert(name, val);
            }
        }

        // 7. Auth Injection
        match input.auth.auth_type {
            AuthType::Bearer => {
                if let Some(token) = &input.auth.token {
                    let auth_val = format!("Bearer {}", token.trim());
                    if let Ok(val) = HeaderValue::from_str(&auth_val) {
                        header_map.insert(reqwest::header::AUTHORIZATION, val);
                    }
                }
            }
            AuthType::Basic => {
                let user = input.auth.username.as_deref().unwrap_or("");
                let pass = input.auth.password.as_deref().unwrap_or("");
                use std::io::Write;
                let mut buf = Vec::new();
                let _ = write!(&mut buf, "{}:{}", user, pass);
                let encoded = format!("Basic {}", Self::base64_encode(&buf));
                if let Ok(val) = HeaderValue::from_str(&encoded) {
                    header_map.insert(reqwest::header::AUTHORIZATION, val);
                }
            }
            AuthType::ApiKey => {
                if input.auth.add_to.as_deref() != Some("query") {
                    if let (Some(k), Some(v)) = (&input.auth.key, &input.auth.value) {
                        if let (Ok(name), Ok(val)) =
                            (HeaderName::from_str(k.trim()), HeaderValue::from_str(v))
                        {
                            header_map.insert(name, val);
                        }
                    }
                }
            }
            AuthType::None => {}
        }

        // 8. Body setup
        match input.body.mode {
            BodyMode::RawJson => {
                if !header_map.contains_key(reqwest::header::CONTENT_TYPE) {
                    header_map.insert(
                        reqwest::header::CONTENT_TYPE,
                        HeaderValue::from_static("application/json; charset=utf-8"),
                    );
                }
                if let Some(raw) = input.body.raw {
                    req_builder = req_builder.body(raw);
                }
            }
            BodyMode::RawText => {
                if !header_map.contains_key(reqwest::header::CONTENT_TYPE) {
                    header_map.insert(
                        reqwest::header::CONTENT_TYPE,
                        HeaderValue::from_static("text/plain; charset=utf-8"),
                    );
                }
                if let Some(raw) = input.body.raw {
                    req_builder = req_builder.body(raw);
                }
            }
            BodyMode::Urlencoded => {
                if !header_map.contains_key(reqwest::header::CONTENT_TYPE) {
                    header_map.insert(
                        reqwest::header::CONTENT_TYPE,
                        HeaderValue::from_static("application/x-www-form-urlencoded"),
                    );
                }
                let mut pairs = Vec::new();
                for item in input.body.form_data.iter().filter(|i| i.enabled) {
                    pairs.push((item.key.clone(), item.value.clone()));
                }
                req_builder = req_builder.form(&pairs);
            }
            BodyMode::FormData => {
                let mut form = reqwest::multipart::Form::new();
                for item in input.body.form_data.iter().filter(|i| i.enabled) {
                    form = form.text(item.key.clone(), item.value.clone());
                }
                req_builder = req_builder.multipart(form);
            }
            BodyMode::None => {}
        }

        req_builder = req_builder.headers(header_map);

        // 9. Execute request
        let start_time = Instant::now();
        let response = req_builder
            .send()
            .await
            .map_err(|e| CommandError::http_error(format!("HTTP request failed: {}", e)))?;
        let duration_ms = start_time.elapsed().as_millis();

        let status = response.status().as_u16();
        let status_text = response
            .status()
            .canonical_reason()
            .unwrap_or("")
            .to_string();

        let mut resp_headers = Vec::new();
        let mut content_type = None;
        for (name, val) in response.headers() {
            let name_str = name.as_str();
            let val_str = val.to_str().unwrap_or("").to_string();
            if name_str.eq_ignore_ascii_case("content-type") {
                content_type = Some(val_str.clone());
            }
            let redacted_val = Redactor::redact_header_value(name_str, &val_str);
            resp_headers.push((name_str.to_string(), redacted_val));
        }

        let full_bytes = response.bytes().await.map_err(|e| {
            CommandError::http_error(format!("Failed to read response body: {}", e))
        })?;

        let size_bytes = full_bytes.len();
        let body_truncated = size_bytes > Self::MAX_PREVIEW_BYTES;
        let preview_slice = if body_truncated {
            &full_bytes[..Self::MAX_PREVIEW_BYTES]
        } else {
            &full_bytes[..]
        };

        let body_preview = String::from_utf8_lossy(preview_slice).to_string();

        Ok(ExecuteResponseOutput {
            status,
            status_text,
            duration_ms,
            size_bytes,
            headers: resp_headers,
            body_preview,
            body_truncated,
            content_type,
            redacted_url,
        })
    }

    fn base64_encode(input: &[u8]) -> String {
        const CHARSET: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut result = String::new();
        for chunk in input.chunks(3) {
            let b0 = chunk[0];
            let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
            let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

            result.push(CHARSET[(b0 >> 2) as usize] as char);
            result.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);

            if chunk.len() > 1 {
                result.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
            } else {
                result.push('=');
            }

            if chunk.len() > 2 {
                result.push(CHARSET[(b2 & 0x3F) as usize] as char);
            } else {
                result.push('=');
            }
        }
        result
    }
}
