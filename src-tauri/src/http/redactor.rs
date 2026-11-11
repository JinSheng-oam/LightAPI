pub struct Redactor;

impl Redactor {
    pub const SENSITIVE_HEADERS: &[&str] = &[
        "authorization",
        "proxy-authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "api-key",
        "apikey",
        "token",
        "access-token",
        "x-auth-token",
    ];

    pub const SENSITIVE_QUERY_KEYS: &[&str] = &[
        "token",
        "access_token",
        "auth",
        "key",
        "api_key",
        "apikey",
        "secret",
        "password",
    ];

    pub fn redact_header_value(header_name: &str, value: &str) -> String {
        let name_lower = header_name.to_lowercase();
        if Self::SENSITIVE_HEADERS.iter().any(|&h| h == name_lower) {
            if name_lower == "authorization" && value.to_lowercase().starts_with("bearer ") {
                return "Bearer ********".to_string();
            }
            if name_lower == "authorization" && value.to_lowercase().starts_with("basic ") {
                return "Basic ********".to_string();
            }
            "********".to_string()
        } else {
            value.to_string()
        }
    }

    pub fn redact_url(raw_url: &str) -> String {
        if let Ok(mut parsed) = url::Url::parse(raw_url) {
            let mut redacted_pairs = Vec::new();
            for (k, v) in parsed.query_pairs() {
                let k_lower = k.to_lowercase();
                if Self::SENSITIVE_QUERY_KEYS.iter().any(|&s| s == k_lower) {
                    redacted_pairs.push((k.to_string(), "********".to_string()));
                } else {
                    redacted_pairs.push((k.to_string(), v.to_string()));
                }
            }
            if !redacted_pairs.is_empty() {
                parsed
                    .query_pairs_mut()
                    .clear()
                    .extend_pairs(redacted_pairs.iter().map(|(k, v)| (k.as_str(), v.as_str())));
            }
            parsed.to_string()
        } else {
            raw_url.to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_header_redaction() {
        assert_eq!(
            Redactor::redact_header_value("Authorization", "Bearer eyJhbGciOi..."),
            "Bearer ********"
        );
        assert_eq!(
            Redactor::redact_header_value("X-Api-Key", "super-secret-key"),
            "********"
        );
        assert_eq!(
            Redactor::redact_header_value("Content-Type", "application/json"),
            "application/json"
        );
    }

    #[test]
    fn test_url_redaction() {
        let url = "https://api.example.com/data?token=abc123456&page=2&apiKey=secretKey";
        let redacted = Redactor::redact_url(url);
        assert!(redacted.contains("page=2"));
        assert!(redacted.contains("token=********"));
        assert!(redacted.contains("apiKey=********"));
    }
}
