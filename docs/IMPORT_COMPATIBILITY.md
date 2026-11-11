# LightAPI 导入兼容性矩阵 (Import Compatibility Matrix)

更新时间：2026-11-11 (M0 阶段交付)

本文档明确记录 LightAPI 对各类 API 规范及工具导出数据的兼容范围、映射策略与已知限制。

---

## 1. 格式兼容性总览

| 输入格式 | 当前支持度 | 适配器 (Adapter) | 关键特性支持 | 验证状态 |
|---|---|---|---|---|
| **Apifox 导出的 OpenAPI 3.0** (JSON/YAML) | 完整支持 (P0) | `OpenApiImporter` | paths, operations, servers, tags, parameters, requestBody, responses | ✅ 经过 Golden Test 自动化测试 (`petstore_3_0.json`) |
| **OpenAPI 3.1** (JSON/YAML) | 基础支持 (P0) | `OpenApiImporter` | paths, operations, servers, tags | ✅ 经过 Golden Test 自动化测试 (`api_3_1.yaml`) |
| **Swagger 2.0** (JSON/YAML) | 完整支持 (P0) | `Swagger2Importer` | host, basePath, schemes, paths, operations, parameters (query/path/header/body) | ✅ 经过 Golden Test 自动化测试 (`swagger_sample.json`) |
| **Apifox 原生导出格式** | 探测与结构预警 (P0 推进中) | `ApifoxNativeImporter` | 格式自动探测；提示使用 OpenAPI 3.0 导出以获得最大保真度 | 🟡 待收集完整真实脱敏样本后推进 M1 深度解析 |
| **Postman Collection v2.1** | 规划中 (P1) | `PostmanImporter` | 计划在 M2 阶段引入 | ⏳ 待开始 |
| **cURL 文本粘贴** | 规划中 (P1) | `CurlImporter` | 计划在 M2 阶段引入 | ⏳ 待开始 |

---

## 2. 字段映射契约

### 2.1 OpenAPI 3.x 映射规则
- `info.title` → `CanonicalProject.name`
- `info.description` → `CanonicalProject.description`
- `servers[].url` → 提取为默认环境的 `BaseUrlItem` 列表
- `tags[].name` → `CanonicalFolder` 目录树节点
- `paths[path][method]` → `CanonicalRequest`：
  - `summary` / `operationId` → `name`
  - `parameters` (in = query / path / header) → 转换为对应结构并按 `required` 设置默认勾选状态
  - `requestBody.content['application/json'].example` → 填充为默认 JSON 请求体

### 2.2 Swagger 2.0 映射规则
- `host` + `basePath` + `schemes[0]` → 拼接为默认服务前置 URL (`{{baseUrl}}`)
- `parameters` (in = body) → 自动提取 Schema 并转为 `raw-json` 请求体
- `tags` → 映射为目录分组

---

## 3. 安全与防爆保护

1. **体积上限**：导入文件默认设置 20 MiB 限制，超过直接拦截。
2. **零脚本执行**：仅解析静态接口数据定义，绝不执行源文件中任何外部嵌入式 JS 脚本或后置执行器。
3. **事务保证**：导入数据落盘在单个 SQLite 事务中完成，任何环节报错自动回滚，绝不残留半成品脏数据。
