# LightAPI

> **轻量级、离线优先、无需登录的 Apifox 兼容 API 调试与测试桌面客户端**

LightAPI 是一款专为开发者与测试人员打造的本地优先 API 调试工具。它旨在解决主流商业 API 工具客户端日益笨重、强制云端同步与登录等痛点，提供毫秒级启动、极低内存占用、直观易用且深度兼容 Apifox / OpenAPI / Swagger 导入的现代桌面体验。

---

## 核心特性

- **本地优先 & 0 云端遥测**：所有配置、环境、接口定义及历史记录全部存储于本机 SQLite 数据库，数据安全完全掌控在自己手中。
- **无需登录**：打开即用，没有任何阻断式注册登录流程。
- **Apifox & OpenAPI 兼容**：支持直接导入 Apifox 导出的 OpenAPI 3.0/3.1、Swagger 2.0 及原生项目格式。
- **高性能原生 HTTP 引擎**：由 Rust `reqwest` + `tokio` 强力驱动，彻底告别浏览器 `fetch` 造成的跨域（CORS）与受限请求头问题。
- **环境与动态变量**：支持 `开发 / 测试 / 生产` 等多环境无缝切换，支持 `{{baseUrl}}`、`{{token}}` 等动态占位符插值。
- **安全与生产保护**：对非安全请求方法（POST/PUT/DELETE）发送到生产环境具备二次确认保护；敏感凭证与请求头默认脱敏展示。

---

## 技术架构

- **桌面运行时**：[Tauri 2](https://v2.tauri.app/)
- **后端核心**：Rust (`reqwest`, `rusqlite`, `tokio`, `serde`, `thiserror`)
- **前端交互**：Svelte 5 + TypeScript + Vite
- **本地存储**：SQLite (WAL 模式持久化与版本化迁移)

---

## 快速上手

### 环境要求

- [Rust](https://www.rust-lang.org/) (>= 1.77)
- [Node.js](https://nodejs.org/) (>= 20)
- [pnpm](https://pnpm.io/) (>= 9)

### 本地开发

```bash
# 安装前端依赖
pnpm install

# 启动桌面开发工作台
pnpm tauri dev
```

### 构建打包

```bash
# 构建生产发布包 (Windows MSI / NSIS)
pnpm tauri build
```

---

## 开源协议

本项目基于 [MIT License](LICENSE) 许可开源。
