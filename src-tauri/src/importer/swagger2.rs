use crate::domain::environment::{BaseUrlItem, Environment};
use crate::domain::importer::{ImportWarning, ParsedProjectBundle};
use crate::domain::project::{CanonicalFolder, CanonicalProject};
use crate::domain::request::{
    BodyMode, CanonicalRequest, HeaderItem, HttpMethod, ParamItem, RequestBody,
};
use crate::error::CommandError;
use serde_json::Value;
use std::collections::HashMap;

pub struct Swagger2Importer;

impl Swagger2Importer {
    pub fn detect(value: &Value) -> bool {
        if let Some(swagger) = value.get("swagger").and_then(|v| v.as_str()) {
            swagger == "2.0"
        } else {
            false
        }
    }

    pub fn parse(value: &Value) -> Result<ParsedProjectBundle, CommandError> {
        let info = value.get("info");
        let title = info
            .and_then(|i| i.get("title"))
            .and_then(|t| t.as_str())
            .unwrap_or("Swagger 2.0 Imported Project");
        let description = info
            .and_then(|i| i.get("description"))
            .and_then(|d| d.as_str())
            .map(|s| s.to_string());

        let mut project = CanonicalProject::new(title);
        project.description = description;
        project.source_format = Some("swagger-2.0".to_string());

        let mut warnings = Vec::new();

        // 1. Host + BasePath + Schemes -> Base URL
        let host = value
            .get("host")
            .and_then(|h| h.as_str())
            .unwrap_or("localhost:8080");
        let base_path = value.get("basePath").and_then(|b| b.as_str()).unwrap_or("");
        let scheme = value
            .get("schemes")
            .and_then(|s| s.as_array())
            .and_then(|arr| arr.first())
            .and_then(|s| s.as_str())
            .unwrap_or("http");

        let base_url = format!("{}://{}{}", scheme, host, base_path);

        let default_env = Environment {
            id: uuid::Uuid::new_v4().to_string(),
            project_id: project.id.clone(),
            name: "默认环境".to_string(),
            base_urls: vec![BaseUrlItem {
                key: "default".to_string(),
                url: base_url,
                description: Some("从 Swagger host/basePath 提取的服务地址".to_string()),
                enabled: true,
            }],
            variables: Vec::new(),
            is_production: false,
        };

        // 2. Tags -> Folders
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

        // 3. Paths & Operations
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

                        if let Some(tags) = op_val.get("tags").and_then(|t| t.as_array()) {
                            if let Some(first_tag) = tags.first().and_then(|t| t.as_str()) {
                                if let Some(folder) = folder_map.get(first_tag) {
                                    req.folder_id = Some(folder.id.clone());
                                } else {
                                    let folder = CanonicalFolder::new(&project.id, first_tag);
                                    req.folder_id = Some(folder.id.clone());
                                    folder_map.insert(first_tag.to_string(), folder);
                                }
                            }
                        }

                        // Swagger parameters
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

                                    match p_in {
                                        "body" => {
                                            let schema_example = param
                                                .get("schema")
                                                .map(|s| s.to_string())
                                                .unwrap_or_else(|| "{}".to_string());
                                            req.body = RequestBody {
                                                mode: BodyMode::RawJson,
                                                raw: Some(schema_example),
                                                form_data: Vec::new(),
                                            };
                                        }
                                        "header" => {
                                            req.headers.push(HeaderItem {
                                                key: p_name.to_string(),
                                                value: "".to_string(),
                                                enabled: is_required,
                                                description: p_desc,
                                            });
                                        }
                                        _ => {
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
                        }

                        requests.push(req);
                    }
                }
            }
        }

        if requests.is_empty() {
            warnings.push(ImportWarning::new(
                "NO_REQUESTS_FOUND",
                "未在导入的 Swagger 2.0 文件中识别到有效接口定义",
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
