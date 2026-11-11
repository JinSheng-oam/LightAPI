pub mod apifox_native;
pub mod openapi;
pub mod swagger2;

pub use apifox_native::ApifoxNativeImporter;
pub use openapi::OpenApiImporter;
pub use swagger2::Swagger2Importer;

use crate::domain::importer::{ImportPreview, ParsedProjectBundle};
use crate::error::CommandError;
use serde_json::Value;

pub struct ImporterPipeline;

impl ImporterPipeline {
    pub const MAX_FILE_SIZE_BYTES: usize = 20 * 1024 * 1024; // 20 MB limit per PRD 9.1

    pub fn parse_content_to_value(raw: &str) -> Result<Value, CommandError> {
        if raw.len() > Self::MAX_FILE_SIZE_BYTES {
            return Err(CommandError::bad_request(
                "文件体积超过 20MB 上限，已拒绝处理以保护内存安全",
            ));
        }

        // Try JSON first
        if let Ok(v) = serde_json::from_str::<Value>(raw) {
            return Ok(v);
        }

        // Try YAML
        if let Ok(v) = serde_yaml::from_str::<Value>(raw) {
            return Ok(v);
        }

        Err(CommandError::bad_request(
            "无法解析为有效的 JSON 或 YAML 格式，请检查文件语法",
        ))
    }

    pub fn detect_format(val: &Value) -> &'static str {
        if OpenApiImporter::detect(val) {
            "OpenAPI 3.x"
        } else if Swagger2Importer::detect(val) {
            "Swagger 2.0"
        } else if ApifoxNativeImporter::detect(val) {
            "Apifox Native"
        } else {
            "Unknown"
        }
    }

    pub fn preview(raw: &str, file_name: &str) -> Result<ImportPreview, CommandError> {
        let value = Self::parse_content_to_value(raw)?;
        let detected = Self::detect_format(&value);

        match detected {
            "OpenAPI 3.x" => {
                let bundle = OpenApiImporter::parse(&value)?;
                Ok(ImportPreview {
                    detected_format: "OpenAPI 3.x".to_string(),
                    project_name: bundle.project.name,
                    request_count: bundle.requests.len(),
                    folder_count: bundle.folders.len(),
                    environment_count: bundle.environments.len(),
                    warnings: bundle.warnings,
                })
            }
            "Swagger 2.0" => {
                let bundle = Swagger2Importer::parse(&value)?;
                Ok(ImportPreview {
                    detected_format: "Swagger 2.0".to_string(),
                    project_name: bundle.project.name,
                    request_count: bundle.requests.len(),
                    folder_count: bundle.folders.len(),
                    environment_count: bundle.environments.len(),
                    warnings: bundle.warnings,
                })
            }
            "Apifox Native" => {
                let bundle = ApifoxNativeImporter::parse(&value)?;
                Ok(ImportPreview {
                    detected_format: "Apifox Native".to_string(),
                    project_name: bundle.project.name,
                    request_count: bundle.requests.len(),
                    folder_count: bundle.folders.len(),
                    environment_count: bundle.environments.len(),
                    warnings: bundle.warnings,
                })
            }
            _ => Err(CommandError::bad_request(format!(
                "文件 '{}' 无法识别为受支持的 OpenAPI 3 / Swagger 2 / Apifox 格式",
                file_name
            ))),
        }
    }

    pub fn parse(raw: &str, file_name: &str) -> Result<ParsedProjectBundle, CommandError> {
        let value = Self::parse_content_to_value(raw)?;
        let detected = Self::detect_format(&value);

        match detected {
            "OpenAPI 3.x" => OpenApiImporter::parse(&value),
            "Swagger 2.0" => Swagger2Importer::parse(&value),
            "Apifox Native" => ApifoxNativeImporter::parse(&value),
            _ => Err(CommandError::bad_request(format!(
                "文件 '{}' 无法识别为受支持的 OpenAPI 3 / Swagger 2 / Apifox 格式",
                file_name
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openapi_3_0_golden_fixture() {
        let raw = include_str!("../../../tests/fixtures/openapi/petstore_3_0.json");
        let preview = ImporterPipeline::preview(raw, "petstore_3_0.json").expect("preview success");
        assert_eq!(preview.detected_format, "OpenAPI 3.x");
        assert_eq!(preview.project_name, "Swagger Petstore - OpenAPI 3.0");
        assert_eq!(preview.request_count, 4); // /pet POST, /pet/{petId} GET & DELETE, /store/order POST
        assert_eq!(preview.folder_count, 2); // pet, store

        let bundle = ImporterPipeline::parse(raw, "petstore_3_0.json").expect("parse success");
        assert_eq!(bundle.requests.len(), 4);
        assert_eq!(bundle.environments[0].base_urls.len(), 2);
    }

    #[test]
    fn test_openapi_3_1_yaml_golden_fixture() {
        let raw = include_str!("../../../tests/fixtures/openapi/api_3_1.yaml");
        let preview = ImporterPipeline::preview(raw, "api_3_1.yaml").expect("preview success");
        assert_eq!(preview.detected_format, "OpenAPI 3.x");
        assert_eq!(preview.project_name, "Sample OpenAPI 3.1 Service");
        assert_eq!(preview.request_count, 1);
        assert_eq!(preview.folder_count, 1);
    }

    #[test]
    fn test_swagger_2_0_golden_fixture() {
        let raw = include_str!("../../../tests/fixtures/swagger2/swagger_sample.json");
        let preview =
            ImporterPipeline::preview(raw, "swagger_sample.json").expect("preview success");
        assert_eq!(preview.detected_format, "Swagger 2.0");
        assert_eq!(preview.project_name, "Swagger 2.0 Sample API");
        assert_eq!(preview.request_count, 1);

        let bundle = ImporterPipeline::parse(raw, "swagger_sample.json").expect("parse success");
        assert_eq!(
            bundle.environments[0].base_urls[0].url,
            "https://api.example.com/v1"
        );
    }
}
