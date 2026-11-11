# 架构与技术决策记录 (Architecture Decision Records)

本文档记录 LightAPI 项目在技术选型与架构设计过程中的核心决策及其依据。

---

## ADR-01: 采用 Tauri 2 + Rust 作为桌面框架，不使用 Electron

- **状态**：已采纳 (Accepted)
- **背景**：市面主流 API 客户端（如 Postman、部分版本的 Apifox）基于 Electron 构建，启动慢、常驻内存动辄 500MB~1GB。
- **决策**：采用 Tauri 2 框架。界面渲染借助系统原生 WebView2，核心网络通信、文件导入解析、本地数据持久化全部在 Rust 原生层完成。
- **结果**：冷启动时间 < 1.5s，空闲内存占用降低 70% 以上，构建产物仅数十兆字节。

---

## ADR-02: 核心 HTTP 请求由 Rust `reqwest` 发起，禁止浏览器前端 `fetch`

- **状态**：已采纳 (Accepted)
- **背景**：浏览器环境中的 `fetch` 受到 CORS 跨域安全策略、受限标头（如 `Host`, `Cookie`, `Origin`）以及系统底层网络协议的严格限制，无法调试真实的任意内网/外网 API。
- **决策**：由 Rust 端封装 `reqwest::Client`（启用 rustls-tls、连接池与超时控制），前端仅通过 Tauri IPC 传递结构化输入。
- **结果**：彻底消除跨域问题；支持任意自定义 Header 与 Method；请求耗时与字节统计精确到底层系统层。

---

## ADR-03: 统一内部 Canonical 数据模型，解析器与存储解耦

- **状态**：已采纳 (Accepted)
- **背景**：外部 API 规范多样（OpenAPI 3.0, 3.1, Swagger 2.0, Postman, Apifox 原生格式），且 Apifox 原生格式随官方版本迭代。若数据库直接存外部格式，会导致核心逻辑难以维护。
- **决策**：设计内部统一的 `CanonicalProject`、`CanonicalFolder`、`CanonicalRequest`、`Environment` 模型。各导入器只负责将外部源映射为标准模型。
- **结果**：新增格式只需实现 `Importer` trait，核心请求引擎、数据库存储、界面渲染完全零感知。

---

## ADR-04: 本地 SQLite 存储与版本化增量迁移

- **状态**：已采纳 (Accepted)
- **背景**：需要离线可用、数据保存在本机、无需依赖远程数据库服务，并支持海量请求历史滚动修剪。
- **决策**：使用 SQLite (WAL 模式)，在应用启动时自动检测并执行增量 `schema_migrations`。所有数据库写操作由专用阻塞线程池异步执行。
- **结果**：界面始终流畅不卡顿，数据断电保护完备，支持多版本向前向后平滑兼容。

---

## ADR-05: 敏感数据默认脱敏与生产环境误操作防护

- **状态**：已采纳 (Accepted)
- **背景**：API 调试经常涉及 Authorization Token、Cookie、密码、API Key，容易在日志或屏幕共享中发生泄露；同时对生产环境的误操作会造成严重后果。
- **决策**：
  1. 请求头（Authorization、Cookie 等）与敏感 URL 查询参数在界面展示与历史持久化中默认自动脱敏。
  2. 环境模型内置 `is_production` 标记；向生产环境发送具有副作用的非幂等请求（POST/PUT/DELETE）前必须弹出二次确认。
- **结果**：大幅提升企业与个人开发者日常调试的数据安全水平。
