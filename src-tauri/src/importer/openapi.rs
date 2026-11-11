use crate::domain::environment::{BaseUrlItem, Environment};
use crate::domain::importer::{ImportWarning, ParsedProjectBundle};
use crate::domain::project::{CanonicalFolder, CanonicalProject};
use crate::domain::request::{
    BodyMode, CanonicalRequest, HeaderItem, HttpMethod, ParamItem, RequestBody,
};
use crate::error::CommandError;
use serde_json::Value;
use std::collections::HashMap;

pub struct OpenApiImporter;

impl OpenApiImporter {
    pub fn detect(value: &Value) -> bool {
        if let Some(openapi) = value.get("openapi").and_then(|v| v.as_str()) {
            openapi.starts_with("3.")
        } else {
            false
        }
    }

    pub fn parse(value: &Value) -> Result<ParsedProjectBundle, CommandError> {
        let openapi_ver = value
            .get("openapi")
            .and_then(|v| v.as_str())
            .unwrap_or("3.0");

        let info = value.get("info");
        let title = info
            .and_then(|i| i.get("title"))
            .and_then(|t| t.as_str())
            .unwrap_or("OpenAPI Imported Project");
        let description = info
            .and_then(|i| i.get("description"))
            .and_then(|d| d.as_str())
            .map(|s| s.to_string());

        let mut project = CanonicalProject::new(title);
        project.description = description;
        project.source_format = Some(format!("openapi-{}", openapi_ver));

        let mut warnings = Vec::new();

        // 1. Extract servers as Environments
        let mut base_urls = Vec::new();
        if let Some(servers) = value.get("servers").and_then(|s| s.as_array()) {
            for (idx, s) in servers.iter().enumerate() {
                if let Some(url_str) = s.get("url").and_then(|u| u.as_str()) {
                    let desc = s
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|d| d.to_string());
                    base_urls.push(BaseUrlItem {
                        key: format!("server_{}", idx + 1),
                        url: url_str.to_string(),
                        description: desc,
                        enabled: idx == 0,
                    });
                }
            }
        }

        if base_urls.is_empty() {
            base_urls.push(BaseUrlItem {
                key: "default".to_string(),
                url: "http://localhost:8080".to_string(),
                description: Some("默认前置地址".to_string()),
                enabled: true,
            });
        }

        let default_env = Environment {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            name: "默认环境".to_string(),
            base_urls,
            variables: Vec::new(),
            is_production: false,
        };

        // 2. Extract Tags as Folders
        let mut folder_map: HashMap<String, CanonicalFolder> = HashMap::new();
        if let Some(tags) = value.get("tags").and_then(|t| t.as_array()) {
            for (idx, tag) in tags.iter().enumerate() {
                if let Some(name) = tag.get("name").and_then(|n| n.as_str()) {
                    let mut folder = CanonicalFolder::new(&project.id, name);
                    folder.sort_order = idx as i32;
                    folder_map.insert(name.to_string(), folder);
                }
            }
        }

        // 3. Extract Paths & Operations
        let mut requests = Vec::new();
        if let Some(paths) = value.get("paths").and_then(|p| p.as_object()) {
            for (path_str, path_item) in paths {
                if let Some(ops) = path_item.as_object() {
                    for (method_str, op_val) in ops {
                        let method_upper = method_str.to_uppercase();
                        if !["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
                            .contains(&method_upper.as_str())
                        {
                            continue;
                        }

                        let op_name = op_val
                            .get("summary")
                            .or_else(|| op_val.get("operationId"))
                            .and_then(|s| s.as_str())
                            .unwrap_or(path_str);

                        let op_desc = op_val
                            .get("description")
                            .and_then(|d| d.as_str())
                            .map(|d| d.to_string());

                        let method = HttpMethod::from_str_loose(&method_upper);
                        let mut req = CanonicalRequest::new(&project.id, op_name, method, path_str);
                        req.description = op_desc;
                        req.source_id = op_val
                            .get("operationId")
                            .and_then(|id| id.as_str())
                            .map(|id| id.to_string());

                        // Match folder by tag
                        if let Some(tags) = op_val.get("tags").and_then(|t| t.as_array()) {
                            if let Some(first_tag) = tags.first().and_then(|t| t.as_str()) {
                                if let Some(folder) = folder_map.get(first_tag) {
                                    req.folder_id = Some(folder.id.clone());
                                } else {
                                    // Create folder dynamically for tag
                                    let folder = CanonicalFolder::new(&project.id, first_tag);
                                    req.folder_id = Some(folder.id.clone());
                                    folder_map.insert(first_tag.to_string(), folder);
                                }
                            }
                        }

                        // Extract parameters
                        if let Some(params) = op_val.get("parameters").and_then(|p| p.as_array()) {
                            for param in params {
                                if let Some(p_name) = param.get("name").and_then(|n| n.as_str()) {
                                    let p_in =
                                        param.get("in").and_then(|i| i.as_str()).unwrap_or("query");
                                    let p_desc = param
                                        .get("description")
                                        .and_then(|d| d.as_str())
                                        .map(|d| d.to_string());
                                    let is_required = param
                                        .get("required")
                                        .and_then(|r| r.as_bool())
                                        .unwrap_or(false);

                                    if p_in == "header" {
                                        req.headers.push(HeaderItem {
                                            key: p_name.to_string(),
                                            value: "".to_string(),
                                            enabled: is_required,
                                            description: p_desc,
                                        });
                                    } else {
                                        req.params.push(ParamItem {
                                            key: p_name.to_string(),
                                            value: "".to_string(),
                                            enabled: is_required,
                                            description: p_desc,
                                            param_type: p_in.to_string(),
                                        });
                                    }
                                }
                            }
                        }

                        // Extract requestBody
                        if let Some(req_body) = op_val.get("requestBody") {
                            if let Some(content) =
                                req_body.get("content").and_then(|c| c.as_object())
                            {
                                if let Some(json_content) = content.get("application/json") {
                                    let example = json_content
                                        .get("example")
                                        .map(|e| e.to_string())
                                        .unwrap_or_else(|| "{}".to_string());
                                    req.body = RequestBody {
                                        mode: BodyMode::RawJson,
                                        raw: Some(example),
                                        form_data: Vec::new(),
                                    };
                                }
                            }
                        }

                        requests.push(req);
                    }
                }
            }
        }

        if requests.is_empty() {
            warnings.push(ImportWarning::new(
                "NO_REQUESTS_FOUND",
                "未在导入的 OpenAPI 文件中识别到有效接口定义",
            ));
        }

        Ok(ParsedProjectBundle {
            project,
            folders: folder_map.into_values().collect(),
            requests,
            environments: vec![default_env],
            warnings,
        })
    }
}
