pub mod environment;
pub mod history;
pub mod importer;
pub mod project;
pub mod request;

pub use environment::*;
pub use history::*;
pub use importer::*;
pub use project::*;
pub use request::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canonical_project_creation() {
        let project = CanonicalProject::new("测试项目");
        assert_eq!(project.name, "测试项目");
        assert!(!project.id.is_empty());
    }

    #[test]
    fn test_canonical_request_and_http_method() {
        let req = CanonicalRequest::new("proj_1", "获取用户列表", HttpMethod::Get, "/api/users");
        assert_eq!(req.method.as_str(), "GET");
        assert_eq!(req.path, "/api/users");
        assert_eq!(req.body.mode, BodyMode::None);

        let json = serde_json::to_string(&req).expect("serialize request");
        assert!(json.contains("\"GET\""));
    }

    #[test]
    fn test_environment_and_variable() {
        let mut env = Environment::new("proj_1", "开发环境", false);
        env.variables
            .push(Variable::new("baseUrl", "http://localhost:3000"));

        assert_eq!(env.variables.len(), 1);
        assert_eq!(env.variables[0].key, "baseUrl");
        assert_eq!(env.variables[0].value, "http://localhost:3000");
        assert!(!env.is_production);
    }
}
