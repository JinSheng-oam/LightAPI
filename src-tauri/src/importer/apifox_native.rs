use crate::domain::importer::{ImportWarning, ParsedProjectBundle};
use crate::domain::project::CanonicalProject;
use crate::error::CommandError;
use serde_json::Value;

pub struct ApifoxNativeImporter;

impl ApifoxNativeImporter {
    pub fn detect(value: &Value) -> bool {
        // Apifox native JSON usually contains "apifoxProject" or "apifox" top-level keys
        value.get("apifoxProject").is_some()
            || value.get("apifox").is_some()
            || (value.get("version").is_some() && value.get("apiCollection").is_some())
    }

    pub fn parse(value: &Value) -> Result<ParsedProjectBundle, CommandError> {
        let title = value
            .get("name")
            .or_else(|| value.get("projectName"))
            .and_then(|n| n.as_str())
            .unwrap_or("Apifox Native Project");

        let mut project = CanonicalProject::new(title);
        project.source_format = Some("apifox-native-pending".to_string());

        let warnings = vec![ImportWarning::new(
            "APIFOX_NATIVE_PENDING_SAMPLE",
            "已识别为 Apifox 原生格式。依据项目规范，原生格式结构随版本演进，当前版本处于样本适配阶段，建议优先使用 Apifox 导出的 OpenAPI 3.0 格式导入以获得完整的请求字段保真度。",
        )];

        Ok(ParsedProjectBundle {
            project,
            folders: Vec::new(),
            requests: Vec::new(),
            environments: Vec::new(),
            warnings,
        })
    }
}
