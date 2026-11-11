use lightapi_lib::domain::request::HttpMethod;
use lightapi_lib::http::{ExecuteRequestInput, HttpEngine};
use lightapi_lib::importer::ImporterPipeline;
use lightapi_lib::repository::{
    Database, EnvironmentRepository, HistoryRepository, ProjectRepository, RequestRepository,
};
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn test_m0_end_to_end_lifecycle() {
    // 1. Initialize In-memory Database and HTTP Engine
    let db = Database::new_in_memory().expect("Database init");
    let http = HttpEngine::new();

    // 2. Import OpenAPI 3.0 specification from fixture
    let raw_spec = include_str!("../../tests/fixtures/openapi/petstore_3_0.json");
    let bundle = ImporterPipeline::parse(raw_spec, "petstore_3_0.json").expect("parse spec");

    assert_eq!(bundle.project.name, "Swagger Petstore - OpenAPI 3.0");
    assert_eq!(bundle.requests.len(), 4);
    assert_eq!(bundle.folders.len(), 2);

    // 3. Persist imported bundle to SQLite database
    db.with_conn(|conn| {
        ProjectRepository::create_project(conn, &bundle.project)?;
        for folder in &bundle.folders {
            ProjectRepository::save_folder(conn, folder)?;
        }
        for env in &bundle.environments {
            EnvironmentRepository::save_environment(conn, env)?;
        }
        for req in &bundle.requests {
            RequestRepository::save_request(conn, req)?;
        }
        Ok(())
    })
    .expect("persist bundle to database");

    // 4. Verify data was persisted properly in SQLite
    let persisted_projects = db
        .with_conn(ProjectRepository::list_projects)
        .expect("list projects");
    assert_eq!(persisted_projects.len(), 1);

    let persisted_requests = db
        .with_conn(|conn| RequestRepository::list_requests(conn, &bundle.project.id))
        .expect("list requests");
    assert_eq!(persisted_requests.len(), 4);

    let persisted_envs = db
        .with_conn(|conn| EnvironmentRepository::list_environments(conn, &bundle.project.id))
        .expect("list environments");
    assert_eq!(persisted_envs.len(), 1);

    // 5. Setup Local WireMock Server to test HTTP execution
    let mock_server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v2/pet"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": 1001,
            "name": "Doggie",
            "status": "available"
        })))
        .mount(&mock_server)
        .await;

    // 6. Find the POST /pet request
    let pet_post_req = persisted_requests
        .iter()
        .find(|r| r.method == HttpMethod::Post && r.path == "/pet")
        .expect("find POST /pet request");

    // 7. Resolve URL with mock_server base URL
    let target_url = format!("{}/v2{}", mock_server.uri(), pet_post_req.path);

    let exec_input = ExecuteRequestInput {
        execution_id: Some("test-exec-1".to_string()),
        url: target_url,
        method: pet_post_req.method.clone(),
        params: pet_post_req.params.clone(),
        headers: pet_post_req.headers.clone(),
        body: pet_post_req.body.clone(),
        auth: pet_post_req.auth.clone(),
        timeout_ms: Some(5000),
    };

    let response = http
        .execute(exec_input)
        .await
        .expect("execute request successfully");

    assert_eq!(response.status, 200);
    assert!(response.body_preview.contains("Doggie"));

    // 8. Record history into SQLite and verify
    let history_entry = lightapi_lib::domain::history::RequestHistory::new(
        &bundle.project.id,
        &pet_post_req.id,
        pet_post_req.method.as_str(),
        response.status,
        response.duration_ms,
        response.size_bytes,
        &response.redacted_url,
    );

    db.with_conn(|conn| HistoryRepository::save_history(conn, &history_entry))
        .expect("save history");

    let history_list = db
        .with_conn(|conn| HistoryRepository::list_history(conn, &bundle.project.id, 10))
        .expect("list history");
    assert_eq!(history_list.len(), 1);
    assert_eq!(history_list[0].status, 200);
    assert!(history_list[0].url_redacted.contains("/v2/pet"));
}
