// LightAPI Interactive High-Fidelity Prototype
// Aligned with LightAPI_Rust_Tauri.md (P0 & P1 Canonical Domain Model & Workflows)

const state = {
  theme: "dark",
  isFirstLaunchEmpty: false,
  sidebarTab: "tree", // 'tree' | 'history'
  searchQuery: "",
  methodFilter: "ALL",
  reqSubTab: "params", // 'params' | 'headers' | 'body' | 'auth' | 'assertions' | 'resolved'
  respSubTab: "pretty", // 'pretty' | 'raw' | 'headers' | 'assertions'
  sendingTimer: null,
  selectedFixtureKey: "apifox_oas30",
  uploadedCustomPreview: null,

  projects: [
    {
      id: "proj_trade",
      name: "核心交易与支付网关 (Apifox OpenAPI 3.0)",
      sourceFormat: "openapi3.0",
      sourceHash: "sha256:9f84c2e1...3a1b",
      activeEnvId: "env_test",
      globalVars: [
        { key: "appVersion", value: "2.4.0", isSecret: false, enabled: true },
        { key: "tenantId", value: "TNT_8801", isSecret: false, enabled: true }
      ],
      environments: [
        {
          id: "env_dev",
          name: "开发环境 (Dev)",
          isProduction: false,
          baseUrl: "http://127.0.0.1:8080",
          variables: [
            { key: "token", value: "dev_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", isSecret: true, enabled: true },
            { key: "merchantId", value: "MCH_DEV_001", isSecret: false, enabled: true }
          ]
        },
        {
          id: "env_test",
          name: "测试环境 (Test)",
          isProduction: false,
          baseUrl: "https://test-gateway.internal.corp",
          variables: [
            { key: "token", value: "test_eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjYifQ", isSecret: true, enabled: true },
            { key: "merchantId", value: "MCH_QA_109", isSecret: false, enabled: true }
          ]
        },
        {
          id: "env_prod",
          name: "生产环境 (Prod)",
          isProduction: true,
          baseUrl: "https://api.pay-core.com",
          variables: [
            { key: "token", value: "prod_live_9981726354_secret_key", isSecret: true, enabled: true },
            { key: "merchantId", value: "MCH_PROD_888", isSecret: false, enabled: true }
          ]
        }
      ],
      folders: [
        { id: "fld_auth", name: "用户与认证模块", collapsed: false },
        { id: "fld_order", name: "订单与交易中心", collapsed: false },
        { id: "fld_pay", name: "支付与清算网关", collapsed: false }
      ],
      requests: [
        {
          id: "req_login",
          folderId: "fld_auth",
          name: "获取商户访问令牌",
          method: "POST",
          path: "{{baseUrl}}/api/v1/auth/token",
          sourceId: "issueMerchantToken",
          dirty: false,
          params: [
            { enabled: true, key: "tenant", value: "{{tenantId}}", desc: "租户标识 (项目全局变量)" }
          ],
          headers: [
            { enabled: true, key: "Content-Type", value: "application/json", isSecret: false },
            { enabled: true, key: "X-Client-Version", value: "{{appVersion}}", isSecret: false }
          ],
          bodyMode: "raw-json",
          bodyText: JSON.stringify({
            merchantId: "{{merchantId}}",
            grantType: "client_credentials",
            scope: "order:write payment:execute"
          }, null, 2),
          auth: { type: "none", token: "", username: "", password: "", apiKeyHeader: "X-API-Key", apiKeyValue: "" },
          assertions: [
            { enabled: true, expr: "status == 200", target: "HTTP 状态码等于 200" },
            { enabled: true, expr: "response_time_ms < 500", target: "响应耗时小于 500ms" },
            { enabled: true, expr: "$.code == 0", target: "业务状态码 $.code 为 0" },
            { enabled: true, expr: "$.data.token exists", target: "返回体内存在令牌字段" }
          ]
        },
        {
          id: "req_order_create",
          folderId: "fld_order",
          name: "创建统一下单交易",
          method: "POST",
          path: "{{baseUrl}}/api/v1/orders/create",
          sourceId: "createUnifiedOrder",
          dirty: true,
          params: [
            { enabled: true, key: "merchantId", value: "{{merchantId}}", desc: "当前环境商户号" },
            { enabled: false, key: "dryRun", value: "true", desc: "仅校验签名不落库" }
          ],
          headers: [
            { enabled: true, key: "Content-Type", value: "application/json", isSecret: false },
            { enabled: true, key: "X-Idempotency-Key", value: "ord_20261110_00921", isSecret: false }
          ],
          bodyMode: "raw-json",
          bodyText: JSON.stringify({
            outTradeNo: "TRD_20261110_88412",
            amountCents: 19900,
            currency: "CNY",
            subject: "LightAPI 企业专业版授权订阅",
            notifyUrl: "https://callback.internal.corp/hooks/order"
          }, null, 2),
          auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "X-API-Key", apiKeyValue: "" },
          assertions: [
            { enabled: true, expr: "status == 200", target: "HTTP 状态码等于 200" },
            { enabled: true, expr: "response_time_ms < 800", target: "响应耗时小于 800ms" },
            { enabled: true, expr: "$.code == 0", target: "业务状态码 $.code 为 0" },
            { enabled: true, expr: "$.data.orderId exists", target: "订单号已生成" }
          ]
        },
        {
          id: "req_order_list",
          folderId: "fld_order",
          name: "分页查询订单列表",
          method: "GET",
          path: "{{baseUrl}}/api/v1/orders",
          sourceId: "listOrders",
          dirty: false,
          params: [
            { enabled: true, key: "page", value: "1", desc: "页码 (从 1 开始)" },
            { enabled: true, key: "pageSize", value: "20", desc: "每页条数" },
            { enabled: true, key: "status", value: "PAID", desc: "订单状态过滤" }
          ],
          headers: [
            { enabled: true, key: "Accept", value: "application/json", isSecret: false }
          ],
          bodyMode: "none",
          bodyText: "",
          auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "X-API-Key", apiKeyValue: "" },
          assertions: [
            { enabled: true, expr: "status == 200", target: "HTTP 状态码等于 200" },
            { enabled: true, expr: "$.data.items exists", target: "包含分页列表数组" }
          ]
        },
        {
          id: "req_order_cancel",
          folderId: "fld_order",
          name: "关闭未支付订单",
          method: "PUT",
          path: "{{baseUrl}}/api/v1/orders/TRD_20261110_88412/close",
          sourceId: "closeOrder",
          dirty: false,
          params: [],
          headers: [
            { enabled: true, key: "Content-Type", value: "application/json", isSecret: false }
          ],
          bodyMode: "raw-json",
          bodyText: JSON.stringify({
            reason: "USER_CANCELLED",
            operator: "qa_tester_01"
          }, null, 2),
          auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "X-API-Key", apiKeyValue: "" },
          assertions: [
            { enabled: true, expr: "status == 200", target: "HTTP 状态码等于 200" }
          ]
        },
        {
          id: "req_refund",
          folderId: "fld_pay",
          name: "执行原路退款申请",
          method: "DELETE",
          path: "{{baseUrl}}/api/v1/payments/PAY_9920183/refund",
          sourceId: "refundPayment",
          dirty: false,
          params: [
            { enabled: true, key: "merchantId", value: "{{merchantId}}", desc: "商户号" }
          ],
          headers: [
            { enabled: true, key: "Content-Type", value: "application/json", isSecret: false }
          ],
          bodyMode: "raw-json",
          bodyText: JSON.stringify({
            refundAmountCents: 19900,
            refundReason: "重复扣款退回"
          }, null, 2),
          auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "X-API-Key", apiKeyValue: "" },
          assertions: [
            { enabled: true, expr: "status == 200", target: "HTTP 状态码等于 200" }
          ]
        }
      ]
    }
  ],

  activeProjectId: "proj_trade",
  openTabIds: ["req_order_create", "req_login", "req_order_list"],
  activeRequestId: "req_order_create",

  history: [
    {
      id: "hist_1",
      time: "18:04:12",
      method: "POST",
      urlRedacted: "https://test-gateway.internal.corp/api/v1/orders/create?merchantId=MCH_QA_109",
      envName: "测试环境 (Test)",
      status: 200,
      durationMs: 42,
      sizeText: "1.48 KB",
      requestId: "req_order_create"
    },
    {
      id: "hist_2",
      time: "18:01:49",
      method: "GET",
      urlRedacted: "https://test-gateway.internal.corp/api/v1/orders?page=1&pageSize=20&status=PAID",
      envName: "测试环境 (Test)",
      status: 200,
      durationMs: 29,
      sizeText: "3.12 KB",
      requestId: "req_order_list"
    },
    {
      id: "hist_3",
      time: "17:58:03",
      method: "POST",
      urlRedacted: "http://127.0.0.1:8080/api/v1/auth/token?tenant=TNT_8801",
      envName: "开发环境 (Dev)",
      status: 401,
      durationMs: 15,
      sizeText: "0.42 KB",
      requestId: "req_login"
    }
  ],

  lastResponse: {
    status: 200,
    statusText: "200 OK",
    durationMs: 42,
    sizeText: "1.48 KB",
    truncated: false,
    headers: [
      ["content-type", "application/json; charset=utf-8"],
      ["x-trace-id", "trc_01JCA98X7M2K8L1P0Q"],
      ["x-upstream-latency-ms", "18"],
      ["set-cookie", "session_token=****** (Sensitive Cookie Masked); HttpOnly; Secure"],
      ["server", "light-gateway/1.14.2"],
      ["date", "Tue, 10 Nov 2026 10:04:12 GMT"]
    ],
    bodyObj: {
      code: 0,
      message: "success",
      traceId: "trc_01JCA98X7M2K8L1P0Q",
      data: {
        orderId: "ORD_20261110180412991",
        outTradeNo: "TRD_20261110_88412",
        merchantId: "MCH_QA_109",
        status: "PREPAID_CREATED",
        amountCents: 19900,
        currency: "CNY",
        payUrl: "https://cashier.internal.corp/pay/ORD_20261110180412991",
        expireAt: "2026-11-10T18:34:12+08:00"
      }
    }
  }
};

// Built-in Import Fixtures for 2-Stage Import Wizard (F02)
const IMPORT_FIXTURES = {
  apifox_oas30: {
    title: "Apifox 导出 OpenAPI 3.0.1 (JSON)",
    fileName: "apifox_logistics_openapi30.json",
    detectedFormat: "OpenAPI 3.0.1 (Apifox 导出标准)",
    sha256: "e3b0c44298fc1c14...852b855",
    projectName: "智慧仓储与物流调度中心 (OpenAPI 3.0)",
    requestCount: 4,
    folderCount: 2,
    envCount: 2,
    blocked: false,
    warnings: [
      { level: "warn", code: "W_EXT_SCRIPT_IGNORED", msg: "检测到 x-apifox-pre-processors 脚本字段 2 处：已按安全策略仅存档纯文本，绝不自动执行 (F02/9.1)。" },
      { level: "warn", code: "W_EXAMPLE_FALLBACK", msg: "路径 POST /wms/v1/inbound 缺少 requestBody.example，已根据 JSON Schema 自动生成示例请求体。" }
    ],
    folders: [
      { id: "fld_wms_in", name: "入库与盘点模块", collapsed: false },
      { id: "fld_wms_out", name: "出库与波次分配", collapsed: false }
    ],
    requests: [
      {
        id: "req_wms_1",
        folderId: "fld_wms_in",
        name: "创建采购入库通知单",
        method: "POST",
        path: "{{baseUrl}}/wms/v1/inbound/orders",
        sourceId: "createInboundOrder",
        dirty: false,
        params: [{ enabled: true, key: "warehouseCode", value: "WH_SH_01", desc: "仓库编码" }],
        headers: [{ enabled: true, key: "Content-Type", value: "application/json", isSecret: false }],
        bodyMode: "raw-json",
        bodyText: JSON.stringify({ asnNo: "ASN_20261110_01", skuCount: 12, expectedArrival: "2026-11-12" }, null, 2),
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      },
      {
        id: "req_wms_2",
        folderId: "fld_wms_in",
        name: "查询实时库位库存明细",
        method: "GET",
        path: "{{baseUrl}}/wms/v1/inventory/stock",
        sourceId: "queryInventoryStock",
        dirty: false,
        params: [{ enabled: true, key: "skuId", value: "SKU_90812", desc: "商品 SKU" }],
        headers: [],
        bodyMode: "none",
        bodyText: "",
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      },
      {
        id: "req_wms_3",
        folderId: "fld_wms_out",
        name: "触发波次拣货任务下发",
        method: "POST",
        path: "{{baseUrl}}/wms/v1/outbound/wave/dispatch",
        sourceId: "dispatchWaveTask",
        dirty: false,
        params: [],
        headers: [{ enabled: true, key: "Content-Type", value: "application/json", isSecret: false }],
        bodyMode: "raw-json",
        bodyText: JSON.stringify({ waveNo: "WAVE_20261110_A", priority: "HIGH" }, null, 2),
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      },
      {
        id: "req_wms_4",
        folderId: "fld_wms_out",
        name: "撤销异常出库复核单",
        method: "DELETE",
        path: "{{baseUrl}}/wms/v1/outbound/review/REV_881",
        sourceId: "cancelOutboundReview",
        dirty: false,
        params: [],
        headers: [],
        bodyMode: "none",
        bodyText: "",
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      }
    ]
  },

  oas31_yaml: {
    title: "OpenAPI 3.1.0 规范文件 (YAML)",
    fileName: "iot_telemetry_openapi31.yaml",
    detectedFormat: "OpenAPI 3.1.0 (YAML 解析分发)",
    sha256: "7d865e959b246691...189592",
    projectName: "工业物联网设备遥测平台 (OpenAPI 3.1)",
    requestCount: 2,
    folderCount: 1,
    envCount: 2,
    blocked: false,
    warnings: [
      { level: "warn", code: "W_OAS31_WEBHOOK_SKIP", msg: "检测到顶层 webhooks 定义 1 处：当前 MVP 仅导入主动调用的 HTTP 接口，webhooks 已记录为 unsupported。" }
    ],
    folders: [{ id: "fld_iot", name: "设备状态与指令下发", collapsed: false }],
    requests: [
      {
        id: "req_iot_1",
        folderId: "fld_iot",
        name: "读取边缘网关实时遥测指标",
        method: "GET",
        path: "{{baseUrl}}/iot/v2/gateways/GW_09/metrics",
        sourceId: "getGatewayMetrics",
        dirty: false,
        params: [{ enabled: true, key: "window", value: "5m", desc: "聚合时间窗" }],
        headers: [],
        bodyMode: "none",
        bodyText: "",
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      },
      {
        id: "req_iot_2",
        folderId: "fld_iot",
        name: "下发设备固件热重启指令",
        method: "POST",
        path: "{{baseUrl}}/iot/v2/gateways/GW_09/reboot",
        sourceId: "rebootGateway",
        dirty: false,
        params: [],
        headers: [{ enabled: true, key: "Content-Type", value: "application/json", isSecret: false }],
        bodyMode: "raw-json",
        bodyText: JSON.stringify({ delaySeconds: 5, reason: "ROUTINE_MAINTENANCE" }, null, 2),
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      }
    ]
  },

  apifox_native: {
    title: "Apifox 原生导出格式 (样本适配矩阵)",
    fileName: "apifox_native_desensitized_sample.json",
    detectedFormat: "Apifox Native Schema (ApifoxNativeImporter)",
    sha256: "4b227777d4dd1fc6...9011c8",
    projectName: "内网统一权限中心 (Apifox 原生样本)",
    requestCount: 2,
    folderCount: 1,
    envCount: 3,
    blocked: false,
    warnings: [
      { level: "warn", code: "W_APIFOX_NATIVE_MATRIX", msg: "原生格式兼容报告：目录树、接口参数、多环境 baseUrl 已精确映射；原生数据库前置操作 (dbConnections) 标记为「不支持执行，仅保留描述」。" }
    ],
    folders: [{ id: "fld_iam", name: "RBAC 角色与权限校验", collapsed: false }],
    requests: [
      {
        id: "req_iam_1",
        folderId: "fld_iam",
        name: "校验用户功能权限点",
        method: "POST",
        path: "{{baseUrl}}/iam/v1/permissions/check",
        sourceId: "apifox_api_99201",
        dirty: false,
        params: [],
        headers: [{ enabled: true, key: "Content-Type", value: "application/json", isSecret: false }],
        bodyMode: "raw-json",
        bodyText: JSON.stringify({ userId: "U_10029", permCode: "order:refund:approve" }, null, 2),
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      },
      {
        id: "req_iam_2",
        folderId: "fld_iam",
        name: "查询部门角色绑定列表",
        method: "GET",
        path: "{{baseUrl}}/iam/v1/roles/bindings",
        sourceId: "apifox_api_99202",
        dirty: false,
        params: [{ enabled: true, key: "deptId", value: "D_302", desc: "部门 ID" }],
        headers: [],
        bodyMode: "none",
        bodyText: "",
        auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
        assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
      }
    ]
  },

  malicious_ref: {
    title: "异常/循环 $ref 炸弹样本 (AC-11 安全拦截测试)",
    fileName: "broken_recursive_ref_bomb.json",
    detectedFormat: "OpenAPI 3.0 (检测到递归引用风险)",
    sha256: "ff0099118822aa33...deadbeef",
    projectName: "不可信外部文件",
    requestCount: 0,
    folderCount: 0,
    envCount: 0,
    blocked: true,
    warnings: [
      { level: "error", code: "E_REF_CYCLE_DETECTED", msg: "阻断导入 (AC-11)：在 components/schemas/NodeA -> NodeB -> NodeA 检测到循环 $ref 递归深度超限 (> 32 层)。" },
      { level: "error", code: "E_REMOTE_REF_BLOCKED", msg: "安全拦截：已阻止自动拉取外部远端引用 https://evil.example.com/schema.json，数据库未写入任何半成品数据。" }
    ],
    folders: [],
    requests: []
  }
};

// Helper: Get active project, environment, and request
function getActiveProject() {
  return state.projects.find((p) => p.id === state.activeProjectId) || state.projects[0];
}

function getActiveEnv() {
  const proj = getActiveProject();
  return proj.environments.find((e) => e.id === proj.activeEnvId) || proj.environments[0];
}

function getActiveRequest() {
  const proj = getActiveProject();
  return proj.requests.find((r) => r.id === state.activeRequestId) || proj.requests[0];
}

// Helper: Variable Resolution (Request Override > Current Environment > Project Global)
function getVariableMap() {
  const proj = getActiveProject();
  const env = getActiveEnv();
  const map = {};

  (proj.globalVars || []).forEach((v) => {
    if (v.enabled && v.key) map[v.key] = { value: v.value, isSecret: v.isSecret, scope: "项目全局" };
  });

  if (env) {
    map["baseUrl"] = { value: env.baseUrl, isSecret: false, scope: `当前环境 (${env.name})` };
    (env.variables || []).forEach((v) => {
      if (v.enabled && v.key) map[v.key] = { value: v.value, isSecret: v.isSecret, scope: `当前环境 (${env.name})` };
    });
  }
  return map;
}

function resolveTemplateString(str, redactSecrets = false) {
  if (!str) return { text: "", missing: [] };
  const varMap = getVariableMap();
  const missing = [];
  const resolved = str.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, varName) => {
    const entry = varMap[varName];
    if (!entry || entry.value === undefined || entry.value === "") {
      missing.push(varName);
      return match;
    }
    if (redactSecrets && entry.isSecret) {
      return "******";
    }
    return entry.value;
  });
  return { text: resolved, missing };
}

function buildResolvedUrl(req, redactSecrets = false) {
  if (!req) return { url: "", missing: [] };
  const baseRes = resolveTemplateString(req.path, redactSecrets);
  const missing = [...baseRes.missing];
  const activeParams = (req.params || []).filter((p) => p.enabled && p.key.trim() !== "");

  if (activeParams.length === 0) {
    return { url: baseRes.text, missing };
  }

  const queryParts = activeParams.map((p) => {
    const kRes = resolveTemplateString(p.key, redactSecrets);
    const vRes = resolveTemplateString(p.value, redactSecrets);
    missing.push(...kRes.missing, ...vRes.missing);
    return `${encodeURIComponent(kRes.text)}=${encodeURIComponent(vRes.text)}`;
  });

  const sep = baseRes.text.includes("?") ? "&" : "?";
  return { url: `${baseRes.text}${sep}${queryParts.join("&")}`, missing: [...new Set(missing)] };
}

// Toast helper
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3000);
}

// Escape HTML safely (F04: never inject unescaped HTML)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Render functions
function renderAll() {
  renderTopBar();
  renderEmptyOrWorkbench();
  if (!state.isFirstLaunchEmpty) {
    renderSidebar();
    renderOpenTabs();
    renderRequestPane();
    renderResponsePane();
  }
}

function renderTopBar() {
  const projSelect = document.getElementById("projectSelect");
  projSelect.innerHTML = state.projects
    .map((p) => `<option value="${p.id}" ${p.id === state.activeProjectId ? "selected" : ""}>${escapeHtml(p.name)}</option>`)
    .join("");

  const proj = getActiveProject();
  const envSelect = document.getElementById("envSelect");
  const env = getActiveEnv();

  envSelect.innerHTML = proj.environments
    .map((e) => `<option value="${e.id}" ${e.id === proj.activeEnvId ? "selected" : ""}>${escapeHtml(e.name)} · ${escapeHtml(e.baseUrl)}</option>`)
    .join("");

  const envDot = document.getElementById("envDot");
  const prodBadge = document.getElementById("prodBadge");
  envDot.className = "env-badge-dot";
  if (env.isProduction) {
    envDot.classList.add("prod");
    prodBadge.style.display = "inline-block";
  } else if (env.id.includes("test")) {
    envDot.classList.add("test");
    prodBadge.style.display = "none";
  } else {
    prodBadge.style.display = "none";
  }

  document.getElementById("btnToggleEmptyState").textContent = state.isFirstLaunchEmpty
    ? "返回工作台视图"
    : "首次启动空状态 (AC-01)";
}

function renderEmptyOrWorkbench() {
  const emptyView = document.getElementById("emptyLaunchView");
  const wbView = document.getElementById("workbenchView");
  if (state.isFirstLaunchEmpty) {
    emptyView.classList.remove("hidden");
    wbView.classList.add("hidden");
  } else {
    emptyView.classList.add("hidden");
    wbView.classList.remove("hidden");
  }
}

function renderSidebar() {
  const proj = getActiveProject();
  document.getElementById("treeTotalCount").textContent = proj.requests.length;
  document.getElementById("historyTotalCount").textContent = state.history.length;

  const tabTree = document.getElementById("navTabTree");
  const tabHist = document.getElementById("navTabHistory");
  const treeControls = document.getElementById("treeControls");
  const treeList = document.getElementById("treeListContainer");
  const histList = document.getElementById("historyListContainer");

  if (state.sidebarTab === "tree") {
    tabTree.classList.add("active");
    tabHist.classList.remove("active");
    treeControls.style.display = "flex";
    treeList.style.display = "block";
    histList.style.display = "none";
    renderTreeList(proj, treeList);
  } else {
    tabTree.classList.remove("active");
    tabHist.classList.add("active");
    treeControls.style.display = "none";
    treeList.style.display = "none";
    histList.style.display = "block";
    renderHistoryList(histList);
  }
}

function renderTreeList(proj, container) {
  const q = state.searchQuery.trim().toLowerCase();
  const mFilter = state.methodFilter;

  const htmlParts = proj.folders.map((folder) => {
    const items = proj.requests.filter((r) => {
      if (r.folderId !== folder.id) return false;
      if (mFilter !== "ALL" && r.method !== mFilter) return false;
      if (q) {
        const hay = `${r.name} ${r.path} ${r.method} ${r.sourceId}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    if (items.length === 0 && (q || mFilter !== "ALL")) return "";

    const childrenHtml = items
      .map((req) => {
        const isActive = req.id === state.activeRequestId;
        const cleanPath = req.path.replace("{{baseUrl}}", "");
        return `
          <div class="tree-item ${isActive ? "active" : ""}" data-req-id="${req.id}">
            <span class="method-tag method-${req.method}">${req.method}</span>
            <div class="item-label-wrap">
              <span class="item-name">${escapeHtml(req.name)}</span>
              <span class="item-path">${escapeHtml(cleanPath || "/")}</span>
            </div>
            ${req.dirty ? `<span class="dirty-dot" title="存在未保存的本地修改"></span>` : `<span></span>`}
          </div>
        `;
      })
      .join("");

    return `
      <div class="folder-group ${folder.collapsed ? "collapsed" : ""}" data-folder-id="${folder.id}">
        <div class="folder-header" data-folder-toggle="${folder.id}">
          <div class="folder-left">
            <span class="folder-arrow">▼</span>
            <span>📁 ${escapeHtml(folder.name)}</span>
          </div>
          <span class="folder-count">${items.length}</span>
        </div>
        <div class="folder-children">
          ${childrenHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = htmlParts.join("") || `<div style="padding: 18px; color: var(--text-muted); text-align: center;">无匹配的接口</div>`;

  container.querySelectorAll("[data-folder-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const fid = el.getAttribute("data-folder-toggle");
      const fld = proj.folders.find((f) => f.id === fid);
      if (fld) {
        fld.collapsed = !fld.collapsed;
        renderSidebar();
      }
    });
  });

  container.querySelectorAll("[data-req-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const rid = el.getAttribute("data-req-id");
      openRequestTab(rid);
    });
  });
}

function renderHistoryList(container) {
  const headerHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid var(--border-subtle); font-size: 11px; color: var(--text-secondary);">
      <span>上限 500 条 · 敏感凭据已脱敏 (F06)</span>
      <button id="btnClearHistory" class="ctrl-btn" style="height: 22px; padding: 0 6px; font-size: 11px;">清空历史</button>
    </div>
  `;

  const listHtml = state.history
    .map(
      (h) => `
      <div class="history-item" data-hist-req="${h.requestId}">
        <div class="history-top">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="method-tag method-${h.method}">${h.method}</span>
            <span class="history-status ${h.status >= 200 && h.status < 300 ? "ok" : "err"}">${h.status}</span>
            <span class="mono" style="font-size: 11px; color: var(--text-muted);">${h.durationMs}ms</span>
          </div>
          <span class="mono" style="font-size: 11px; color: var(--text-muted);">${h.time}</span>
        </div>
        <div class="item-path">${escapeHtml(h.urlRedacted)}</div>
        <div style="font-size: 11px; color: var(--text-muted);">环境: ${escapeHtml(h.envName)} · ${h.sizeText}</div>
      </div>
    `
    )
    .join("");

  container.innerHTML = headerHtml + (listHtml || `<div style="padding: 18px; text-align: center; color: var(--text-muted);">暂无历史记录</div>`);

  const clearBtn = document.getElementById("btnClearHistory");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("确认清空当前项目的请求历史记录吗？（不会影响接口定义）")) {
        state.history = [];
        renderSidebar();
        showToast("已清空请求历史记录");
      }
    });
  }

  container.querySelectorAll("[data-hist-req]").forEach((el) => {
    el.addEventListener("click", () => {
      const rid = el.getAttribute("data-hist-req");
      const proj = getActiveProject();
      if (proj.requests.some((r) => r.id === rid)) {
        openRequestTab(rid);
        showToast("已从历史记录恢复对应接口请求参数");
      }
    });
  });
}

function openRequestTab(reqId) {
  if (!state.openTabIds.includes(reqId)) {
    state.openTabIds.push(reqId);
  }
  state.activeRequestId = reqId;
  renderAll();
}

function renderOpenTabs() {
  const proj = getActiveProject();
  const bar = document.getElementById("openTabsBar");

  const tabsHtml = state.openTabIds
    .map((tid) => {
      const r = proj.requests.find((item) => item.id === tid);
      if (!r) return "";
      const active = r.id === state.activeRequestId;
      return `
        <div class="req-tab ${active ? "active" : ""}" data-tab-id="${r.id}">
          <span class="method-tag method-${r.method}">${r.method}</span>
          <span>${escapeHtml(r.name)}</span>
          ${r.dirty ? `<span class="dirty-dot" title="未保存修改"></span>` : ""}
          <span class="tab-close" data-close-tab="${r.id}" title="关闭标签页">✕</span>
        </div>
      `;
    })
    .join("");

  bar.innerHTML = tabsHtml;

  bar.querySelectorAll("[data-tab-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-close-tab")) return;
      state.activeRequestId = el.getAttribute("data-tab-id");
      renderAll();
    });
  });

  bar.querySelectorAll("[data-close-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const cid = el.getAttribute("data-close-tab");
      const req = proj.requests.find((item) => item.id === cid);
      if (req && req.dirty) {
        if (!confirm(`接口「${req.name}」有未保存的修改，确定关闭标签页吗？`)) return;
      }
      state.openTabIds = state.openTabIds.filter((id) => id !== cid);
      if (state.openTabIds.length === 0 && proj.requests.length > 0) {
        state.openTabIds = [proj.requests[0].id];
      }
      if (state.activeRequestId === cid) {
        state.activeRequestId = state.openTabIds[0];
      }
      renderAll();
    });
  });
}

function renderRequestPane() {
  const req = getActiveRequest();
  const env = getActiveEnv();
  if (!req) return;

  // Production warning banner check
  const prodBanner = document.getElementById("prodGuardBanner");
  if (env.isProduction) {
    prodBanner.classList.remove("hidden");
    document.getElementById("prodBannerUrl").textContent = env.baseUrl;
  } else {
    prodBanner.classList.add("hidden");
  }

  const methodSel = document.getElementById("reqMethodSelect");
  methodSel.value = req.method;
  methodSel.className = `method-select method-${req.method}`;

  const pathInput = document.getElementById("reqPathInput");
  pathInput.value = req.path;

  document.getElementById("reqSourceBadge").textContent = `source: ${req.sourceId || "manual"}`;
  document.getElementById("reqTitleDisplay").textContent = `${req.name}${req.dirty ? " (未保存 ●)" : " (已同步 SQLite)"}`;

  // Live resolved URL preview & missing variable check (F05)
  const resolvedInfo = buildResolvedUrl(req, false);
  document.getElementById("resolvedUrlPreview").textContent = resolvedInfo.url;

  const missingEl = document.getElementById("missingVarWarning");
  if (resolvedInfo.missing.length > 0) {
    missingEl.style.display = "inline";
    missingEl.textContent = `⚠️ 未定义变量: ${resolvedInfo.missing.map((v) => `{{${v}}}`).join(", ")} (发送前将拦截)`;
  } else {
    missingEl.style.display = "none";
  }

  // Update subtab badges
  document.getElementById("badgeParamsCount").textContent = req.params.filter((p) => p.enabled).length;
  document.getElementById("badgeHeadersCount").textContent = req.headers.filter((h) => h.enabled).length;
  document.getElementById("badgeBodyMode").textContent = req.bodyMode === "none" ? "none" : "JSON";
  document.getElementById("badgeAuthType").textContent = req.auth.type.toUpperCase();
  document.getElementById("badgeAssertCount").textContent = req.assertions.filter((a) => a.enabled).length;

  document.querySelectorAll("#reqSubTabs .sec-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-subtab") === state.reqSubTab);
  });

  renderRequestSubTabContent(req);
}

function renderRequestSubTabContent(req) {
  const container = document.getElementById("reqEditorBody");

  if (state.reqSubTab === "params") {
    const rows = req.params
      .map(
        (p, idx) => `
        <tr>
          <td style="width: 34px; text-align: center;">
            <input type="checkbox" data-param-check="${idx}" ${p.enabled ? "checked" : ""} />
          </td>
          <td style="width: 28%;"><input class="kv-input" data-param-key="${idx}" value="${escapeHtml(p.key)}" placeholder="参数名" /></td>
          <td style="width: 34%;"><input class="kv-input" data-param-val="${idx}" value="${escapeHtml(p.value)}" placeholder="参数值，支持 {{var}}" /></td>
          <td><input class="kv-input" data-param-desc="${idx}" value="${escapeHtml(p.desc || "")}" placeholder="说明" /></td>
          <td style="width: 42px; text-align: center;">
            <button class="ctrl-btn ghost" style="height: 22px; padding: 0 6px;" data-param-del="${idx}">✕</button>
          </td>
        </tr>
      `
      )
      .join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 12px; color: var(--text-secondary);">Query 参数表（勾选决定是否随请求发送，自动进行百分号安全编码）</span>
        <button id="btnAddParamRow" class="ctrl-btn" style="height: 24px; font-size: 11px;">+ 添加参数</button>
      </div>
      <table class="kv-table">
        <thead>
          <tr><th>启用</th><th>参数名 (Key)</th><th>参数值 (Value / {{变量}})</th><th>说明</th><th>操作</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    document.getElementById("btnAddParamRow").addEventListener("click", () => {
      req.params.push({ enabled: true, key: "", value: "", desc: "" });
      req.dirty = true;
      renderAll();
    });

    container.querySelectorAll("[data-param-check]").forEach((el) => {
      el.addEventListener("change", () => {
        const idx = Number(el.getAttribute("data-param-check"));
        req.params[idx].enabled = el.checked;
        req.dirty = true;
        renderRequestPane();
      });
    });

    container.querySelectorAll("[data-param-key]").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = Number(el.getAttribute("data-param-key"));
        req.params[idx].key = el.value;
        req.dirty = true;
        renderRequestPane();
      });
    });

    container.querySelectorAll("[data-param-val]").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = Number(el.getAttribute("data-param-val"));
        req.params[idx].value = el.value;
        req.dirty = true;
        renderRequestPane();
      });
    });

    container.querySelectorAll("[data-param-del]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-param-del"));
        req.params.splice(idx, 1);
        req.dirty = true;
        renderAll();
      });
    });
    return;
  }

  if (state.reqSubTab === "headers") {
    const rows = req.headers
      .map(
        (h, idx) => `
        <tr>
          <td style="width: 34px; text-align: center;">
            <input type="checkbox" data-hdr-check="${idx}" ${h.enabled ? "checked" : ""} />
          </td>
          <td style="width: 32%;"><input class="kv-input" data-hdr-key="${idx}" value="${escapeHtml(h.key)}" placeholder="Header Name" /></td>
          <td><input class="kv-input" data-hdr-val="${idx}" value="${escapeHtml(h.value)}" placeholder="Header Value" /></td>
          <td style="width: 90px; text-align: center;">
            <label style="font-size: 11px; color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" data-hdr-secret="${idx}" ${h.isSecret ? "checked" : ""} /> 敏感遮罩
            </label>
          </td>
          <td style="width: 42px; text-align: center;">
            <button class="ctrl-btn ghost" style="height: 22px; padding: 0 6px;" data-hdr-del="${idx}">✕</button>
          </td>
        </tr>
      `
      )
      .join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 12px; color: var(--text-secondary);">HTTP 请求头（敏感 Header 在历史记录与 cURL 导出中自动脱敏）</span>
        <button id="btnAddHeaderRow" class="ctrl-btn" style="height: 24px; font-size: 11px;">+ 添加 Header</button>
      </div>
      <table class="kv-table">
        <thead>
          <tr><th>启用</th><th>Header 名称</th><th>Header 值</th><th>隐私保护</th><th>操作</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    document.getElementById("btnAddHeaderRow").addEventListener("click", () => {
      req.headers.push({ enabled: true, key: "X-Custom-Header", value: "", isSecret: false });
      req.dirty = true;
      renderAll();
    });

    container.querySelectorAll("[data-hdr-check]").forEach((el) => {
      el.addEventListener("change", () => {
        req.headers[Number(el.getAttribute("data-hdr-check"))].enabled = el.checked;
        req.dirty = true;
        renderRequestPane();
      });
    });

    container.querySelectorAll("[data-hdr-key]").forEach((el) => {
      el.addEventListener("input", () => {
        req.headers[Number(el.getAttribute("data-hdr-key"))].key = el.value;
        req.dirty = true;
      });
    });

    container.querySelectorAll("[data-hdr-val]").forEach((el) => {
      el.addEventListener("input", () => {
        req.headers[Number(el.getAttribute("data-hdr-val"))].value = el.value;
        req.dirty = true;
      });
    });

    container.querySelectorAll("[data-hdr-secret]").forEach((el) => {
      el.addEventListener("change", () => {
        req.headers[Number(el.getAttribute("data-hdr-secret"))].isSecret = el.checked;
        req.dirty = true;
      });
    });

    container.querySelectorAll("[data-hdr-del]").forEach((el) => {
      el.addEventListener("click", () => {
        req.headers.splice(Number(el.getAttribute("data-hdr-del")), 1);
        req.dirty = true;
        renderAll();
      });
    });
    return;
  }

  if (state.reqSubTab === "body") {
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-size: 12px; color: var(--text-secondary);">Body 类型：</label>
          <select id="bodyModeSelect" class="ctrl-select" style="height: 26px;">
            <option value="none" ${req.bodyMode === "none" ? "selected" : ""}>none (无请求体)</option>
            <option value="raw-json" ${req.bodyMode === "raw-json" ? "selected" : ""}>raw JSON (application/json)</option>
            <option value="raw-text" ${req.bodyMode === "raw-text" ? "selected" : ""}>raw Text (text/plain)</option>
            <option value="urlencoded" ${req.bodyMode === "urlencoded" ? "selected" : ""}>x-www-form-urlencoded</option>
          </select>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="btnFormatJson" class="ctrl-btn" style="height: 24px; font-size: 11px;">格式化 JSON</button>
        </div>
      </div>
      ${
        req.bodyMode === "none"
          ? `<div style="padding: 24px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-subtle); border-radius: 4px;">当前请求不携带 Body 内容</div>`
          : `<textarea id="reqBodyTextarea" class="code-textarea" spellcheck="false">${escapeHtml(req.bodyText)}</textarea>`
      }
    `;

    document.getElementById("bodyModeSelect").addEventListener("change", (e) => {
      req.bodyMode = e.target.value;
      req.dirty = true;
      renderAll();
    });

    const fmtBtn = document.getElementById("btnFormatJson");
    if (fmtBtn) {
      fmtBtn.addEventListener("click", () => {
        try {
          const parsed = JSON.parse(req.bodyText);
          req.bodyText = JSON.stringify(parsed, null, 2);
          renderRequestSubTabContent(req);
          showToast("JSON 格式化成功");
        } catch (err) {
          showToast("JSON 语法校验提示：若含未带引号的 {{变量}} 请先检查格式");
        }
      });
    }

    const bodyArea = document.getElementById("reqBodyTextarea");
    if (bodyArea) {
      bodyArea.addEventListener("input", () => {
        req.bodyText = bodyArea.value;
        req.dirty = true;
      });
    }
    return;
  }

  if (state.reqSubTab === "auth") {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px; max-width: 560px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="width: 110px; color: var(--text-secondary);">鉴权方式 (F03)：</label>
          <select id="authTypeSelect" class="ctrl-select">
            <option value="none" ${req.auth.type === "none" ? "selected" : ""}>None (无需鉴权)</option>
            <option value="bearer" ${req.auth.type === "bearer" ? "selected" : ""}>Bearer Token</option>
            <option value="basic" ${req.auth.type === "basic" ? "selected" : ""}>Basic Auth</option>
            <option value="apikey" ${req.auth.type === "apikey" ? "selected" : ""}>API Key (Header)</option>
          </select>
        </div>
        ${
          req.auth.type === "bearer"
            ? `
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="width: 110px; color: var(--text-secondary);">Bearer Token：</label>
            <input id="authBearerInput" class="search-input mono" style="padding-right: 10px;" value="${escapeHtml(req.auth.token)}" placeholder="例如 {{token}}" />
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">
            发送时由 Rust 自动注入 <code class="mono">Authorization: Bearer &lt;token&gt;</code>，并在界面预览、日志与历史记录中默认遮罩。
          </div>
        `
            : req.auth.type === "basic"
            ? `
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="width: 110px; color: var(--text-secondary);">用户名 / 密码：</label>
            <input id="authUserInput" class="search-input mono" placeholder="Username" value="${escapeHtml(req.auth.username || "")}" />
            <input id="authPassInput" type="password" class="search-input mono" placeholder="Password" value="${escapeHtml(req.auth.password || "")}" />
          </div>
        `
            : req.auth.type === "apikey"
            ? `
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="width: 110px; color: var(--text-secondary);">Header / Value：</label>
            <input id="authKeyHeaderInput" class="search-input mono" value="${escapeHtml(req.auth.apiKeyHeader || "X-API-Key")}" />
            <input id="authKeyValInput" class="search-input mono" value="${escapeHtml(req.auth.apiKeyValue || "{{token}}")}" />
          </div>
        `
            : `<div style="color: var(--text-muted); font-size: 12px;">当前请求不附加额外 Auth 凭据。</div>`
        }
      </div>
    `;

    document.getElementById("authTypeSelect").addEventListener("change", (e) => {
      req.auth.type = e.target.value;
      req.dirty = true;
      renderAll();
    });

    const bearerIn = document.getElementById("authBearerInput");
    if (bearerIn) {
      bearerIn.addEventListener("input", () => {
        req.auth.token = bearerIn.value;
        req.dirty = true;
      });
    }
    return;
  }

  if (state.reqSubTab === "assertions") {
    const rows = req.assertions
      .map(
        (a, idx) => `
        <tr>
          <td style="width: 34px; text-align: center;">
            <input type="checkbox" data-assert-check="${idx}" ${a.enabled ? "checked" : ""} />
          </td>
          <td style="width: 42%;"><input class="kv-input" data-assert-expr="${idx}" value="${escapeHtml(a.expr)}" /></td>
          <td><input class="kv-input" data-assert-desc="${idx}" value="${escapeHtml(a.target)}" /></td>
          <td style="width: 42px; text-align: center;">
            <button class="ctrl-btn ghost" style="height: 22px; padding: 0 6px;" data-assert-del="${idx}">✕</button>
          </td>
        </tr>
      `
      )
      .join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 12px; color: var(--text-secondary);">
          声明式安全断言 (F07)：支持 <code class="mono">status == 200</code>、<code class="mono">response_time_ms &lt; N</code>、<code class="mono">$.path == val</code>（禁止执行任意第三方 JS）
        </span>
        <button id="btnAddAssertRow" class="ctrl-btn" style="height: 24px; font-size: 11px;">+ 添加断言</button>
      </div>
      <table class="kv-table">
        <thead>
          <tr><th>启用</th><th>声明式表达式</th><th>断言说明</th><th>操作</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    document.getElementById("btnAddAssertRow").addEventListener("click", () => {
      req.assertions.push({ enabled: true, expr: "status == 200", target: "新增状态码校验" });
      req.dirty = true;
      renderAll();
    });

    container.querySelectorAll("[data-assert-del]").forEach((el) => {
      el.addEventListener("click", () => {
        req.assertions.splice(Number(el.getAttribute("data-assert-del")), 1);
        req.dirty = true;
        renderAll();
      });
    });
    return;
  }

  if (state.reqSubTab === "resolved") {
    const redactedUrl = buildResolvedUrl(req, true).url;
    const previewHeaders = req.headers
      .filter((h) => h.enabled)
      .map((h) => `${h.key}: ${h.isSecret ? "****** (Secret Masked)" : resolveTemplateString(h.value, true).text}`);
    if (req.auth.type === "bearer") {
      previewHeaders.unshift("Authorization: Bearer ****** (Redacted by Security Policy)");
    }
    const resolvedBody = req.bodyMode === "none" ? "(empty body)" : resolveTemplateString(req.bodyText, true).text;

    container.innerHTML = `
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
        以下为 Rust <code class="mono">reqwest</code> 引擎即将发送的实际请求快照（敏感字段已按 F03 / AC-13 脱敏遮罩）：
      </div>
      <pre class="code-pre" style="background: var(--bg-input); padding: 10px; border: 1px solid var(--border-subtle); border-radius: 4px;">${escapeHtml(
        `${req.method} ${redactedUrl} HTTP/1.1\n` +
          previewHeaders.join("\n") +
          `\n\n${resolvedBody}`
      )}</pre>
    `;
  }
}

function renderResponsePane() {
  const resp = state.lastResponse;
  const badge = document.getElementById("respStatusBadge");
  badge.textContent = resp.statusText;
  badge.className = `status-pill ${resp.status >= 200 && resp.status < 300 ? "ok" : "err"}`;

  document.getElementById("respDuration").textContent = `${resp.durationMs} ms`;
  document.getElementById("respSize").textContent = resp.sizeText;
  document.getElementById("respTruncatedNotice").style.display = resp.truncated ? "inline-block" : "none";
  document.getElementById("badgeRespHeaders").textContent = resp.headers.length;

  const req = getActiveRequest();
  const totalAsserts = req ? req.assertions.filter((a) => a.enabled).length : 0;
  const passCount = resp.status === 200 ? totalAsserts : Math.max(0, totalAsserts - 2);
  document.getElementById("badgeRespAssertions").textContent = `${passCount}/${totalAsserts}`;

  document.querySelectorAll("#respSubTabs .sec-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-resptab") === state.respSubTab);
  });

  const area = document.getElementById("respContentArea");
  if (state.respSubTab === "pretty") {
    area.innerHTML = `<pre class="code-pre">${escapeHtml(JSON.stringify(resp.bodyObj, null, 2))}</pre>`;
  } else if (state.respSubTab === "raw") {
    area.innerHTML = `<pre class="code-pre">${escapeHtml(JSON.stringify(resp.bodyObj))}</pre>`;
  } else if (state.respSubTab === "headers") {
    const rows = resp.headers
      .map(([k, v]) => `<tr><td class="mono" style="width: 32%;">${escapeHtml(k)}</td><td class="mono">${escapeHtml(v)}</td></tr>`)
      .join("");
    area.innerHTML = `
      <table class="kv-table">
        <thead><tr><th>Header Name</th><th>Value (Sensitive Cookie Auto-Masked)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } else if (state.respSubTab === "assertions") {
    const list = (req ? req.assertions.filter((a) => a.enabled) : []).map((a) => {
      const passed = resp.status === 200 || (!a.expr.includes("200") && !a.expr.includes("$.code == 0"));
      return `
        <div class="warn-item ${passed ? "" : "error"}" style="border-left-color: ${passed ? "var(--status-ok)" : "var(--status-danger)"};">
          <strong class="mono">${passed ? "PASS" : "FAIL"}</strong> · <code class="mono">${escapeHtml(a.expr)}</code> — ${escapeHtml(a.target)}
        </div>
      `;
    });
    area.innerHTML = `<div class="warn-list">${list.join("") || "当前接口未配置声明式断言"}</div>`;
  }
}

// Execute / Send Request Flow (F03 / F05 / AC-06 / AC-07 / AC-08 / AC-12)
function triggerSendRequest(bypassProdConfirm = false) {
  const req = getActiveRequest();
  const env = getActiveEnv();
  if (!req) return;

  // Cancel if currently sending (AC-08)
  if (state.sendingTimer) {
    clearTimeout(state.sendingTimer);
    state.sendingTimer = null;
    const btn = document.getElementById("btnSendRequest");
    btn.classList.remove("sending");
    document.getElementById("sendBtnLabel").textContent = "发送";
    state.lastResponse = {
      status: 0,
      statusText: "CANCELLED (已取消)",
      durationMs: 310,
      sizeText: "0 B",
      truncated: false,
      headers: [["x-tauri-command", "request_cancelled_by_user"]],
      bodyObj: { error: "REQUEST_CANCELLED", message: "请求已由用户主动取消，Rust Tokio 任务句柄已安全回收 (AC-08)" }
    };
    renderResponsePane();
    showToast("已中止正在执行的 HTTP 请求");
    return;
  }

  // 1. Validate unresolved variables before sending (F05)
  const resolvedInfo = buildResolvedUrl(req, false);
  if (resolvedInfo.missing.length > 0) {
    showToast(`阻止发送：存在未定义变量 ${resolvedInfo.missing.map((m) => `{{${m}}}`).join(", ")}`);
    return;
  }

  // 2. Production guardrail check for non-GET/HEAD/OPTIONS (F05 / AC-12)
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (env.isProduction && !safeMethods.includes(req.method) && !bypassProdConfirm) {
    document.getElementById("prodModalMethod").textContent = req.method;
    document.getElementById("prodModalUrl").textContent = buildResolvedUrl(req, true).url;
    document.getElementById("prodConfirmModalBackdrop").classList.remove("hidden");
    return;
  }

  const scenario = document.getElementById("simScenarioSelect").value;
  const btn = document.getElementById("btnSendRequest");
  btn.classList.add("sending");
  document.getElementById("sendBtnLabel").textContent = "取消请求";

  const delay = scenario === "timeout" ? 2600 : 220;

  state.sendingTimer = setTimeout(() => {
    state.sendingTimer = null;
    btn.classList.remove("sending");
    document.getElementById("sendBtnLabel").textContent = "发送";

    if (scenario === "unauth") {
      state.lastResponse = {
        status: 401,
        statusText: "401 Unauthorized",
        durationMs: 19,
        sizeText: "0.31 KB",
        truncated: false,
        headers: [
          ["content-type", "application/json"],
          ["www-authenticate", 'Bearer realm="api", error="invalid_token"']
        ],
        bodyObj: {
          code: 40101,
          message: "访问令牌已过期或签名不匹配",
          hint: "请检查当前环境 {{token}} 变量配置 (AC-07)"
        }
      };
    } else if (scenario === "server_err") {
      state.lastResponse = {
        status: 500,
        statusText: "500 Internal Server Error",
        durationMs: 134,
        sizeText: "0.45 KB",
        truncated: false,
        headers: [["content-type", "application/json"]],
        bodyObj: {
          code: 50000,
          message: "上游清算网关数据库连接池繁忙",
          traceId: "trc_500_err_99182"
        }
      };
    } else if (scenario === "timeout") {
      state.lastResponse = {
        status: 504,
        statusText: "TIMEOUT (连接超时)",
        durationMs: 2600,
        sizeText: "0 B",
        truncated: false,
        headers: [["x-reqwest-error", "TimedOut"]],
        bodyObj: {
          errorCode: "E_HTTP_TIMEOUT",
          message: "Rust reqwest 请求超过设定阈值，遵循安全规范未对非幂等请求自动重试"
        }
      };
    } else if (scenario === "large") {
      state.lastResponse = {
        status: 200,
        statusText: "200 OK",
        durationMs: 168,
        sizeText: "2.40 MB (Preview 64 KB)",
        truncated: true,
        headers: [
          ["content-type", "application/json; charset=utf-8"],
          ["x-body-truncated", "true (saved to local temp file)"]
        ],
        bodyObj: {
          code: 0,
          notice: "响应体积 2.40 MB 超过前端直接渲染阈值，已限量展示前 64 KB，完整数据可点击「保存到文件」读取 (F04 / AC-08)",
          sampleItems: [
            { id: 1, tradeNo: "TRD_90001", amount: 8800 },
            { id: 2, tradeNo: "TRD_90002", amount: 12500 }
          ]
        }
      };
    } else {
      state.lastResponse = {
        status: 200,
        statusText: "200 OK",
        durationMs: 38,
        sizeText: "1.52 KB",
        truncated: false,
        headers: [
          ["content-type", "application/json; charset=utf-8"],
          ["x-trace-id", "trc_" + Math.random().toString(36).substring(2, 10).toUpperCase()],
          ["set-cookie", "sid=****** (Redacted); Path=/; HttpOnly"]
        ],
        bodyObj: {
          code: 0,
          message: "success",
          environment: env.name,
          resolvedBaseUrl: env.baseUrl,
          requestMethod: req.method,
          data: {
            orderId: "ORD_" + Date.now(),
            merchantId: getVariableMap().merchantId?.value || "MCH_DEFAULT",
            status: "SUCCESS",
            timestamp: new Date().toISOString()
          }
        }
      };
    }

    // Record redacted history entry (F06)
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    state.history.unshift({
      id: "hist_" + Date.now(),
      time: timeStr,
      method: req.method,
      urlRedacted: buildResolvedUrl(req, true).url,
      envName: env.name,
      status: state.lastResponse.status,
      durationMs: state.lastResponse.durationMs,
      sizeText: state.lastResponse.sizeText,
      requestId: req.id
    });

    renderSidebar();
    renderResponsePane();
    showToast(`请求完成: ${state.lastResponse.statusText} (${state.lastResponse.durationMs} ms)`);
  }, delay);
}

// Two-Stage Import Modal Logic (F02)
function openImportModal() {
  state.uploadedCustomPreview = null;
  renderImportModalContent();
  document.getElementById("importModalBackdrop").classList.remove("hidden");
}

function renderImportModalContent() {
  const grid = document.getElementById("fixtureSelectorGrid");
  grid.innerHTML = Object.entries(IMPORT_FIXTURES)
    .map(([key, item]) => {
      const selected = !state.uploadedCustomPreview && state.selectedFixtureKey === key;
      return `
        <div class="fixture-card ${selected ? "selected" : ""}" data-fixture-key="${key}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 12px;">${escapeHtml(item.title)}</strong>
            <span class="mono" style="font-size: 10px; color: var(--text-muted);">${escapeHtml(item.fileName)}</span>
          </div>
          <span style="font-size: 11px; color: var(--text-secondary);">识别器: ${escapeHtml(item.detectedFormat)}</span>
        </div>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-fixture-key]").forEach((el) => {
    el.addEventListener("click", () => {
      state.uploadedCustomPreview = null;
      state.selectedFixtureKey = el.getAttribute("data-fixture-key");
      renderImportModalContent();
    });
  });

  const preview = state.uploadedCustomPreview || IMPORT_FIXTURES[state.selectedFixtureKey];
  const box = document.getElementById("importPreviewBox");
  const commitBtn = document.getElementById("btnCommitImport");

  commitBtn.disabled = preview.blocked;
  commitBtn.style.opacity = preview.blocked ? "0.45" : "1";

  const warningsHtml = preview.warnings
    .map(
      (w) => `
      <div class="warn-item ${w.level === "error" ? "error" : ""}">
        <strong class="mono">[${escapeHtml(w.code)}]</strong> ${escapeHtml(w.msg)}
      </div>
    `
    )
    .join("");

  box.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <span style="font-weight: 600;">步骤 2：两阶段解析预览报告 (<code class="mono">preview_import</code>)</span>
        <span style="margin-left: 8px; font-size: 11px; color: var(--text-secondary);">项目名：<strong>${escapeHtml(preview.projectName)}</strong></span>
      </div>
      <span class="mono" style="font-size: 11px; color: var(--text-muted);">源文件哈希: ${escapeHtml(preview.sha256)}</span>
    </div>

    <div class="preview-metrics">
      <div class="metric-box">
        <div class="metric-label">自动探测格式</div>
        <div class="metric-val" style="font-size: 12px;">${escapeHtml(preview.detectedFormat)}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">可导入接口数</div>
        <div class="metric-val">${preview.requestCount}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">目录/Tag 分组数</div>
        <div class="metric-val">${preview.folderCount}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">提取候选环境数</div>
        <div class="metric-val">${preview.envCount}</div>
      </div>
    </div>

    <div class="warn-list">
      <div style="font-size: 11px; color: var(--text-secondary);">映射质量与安全检查报告（绝不静默丢弃不兼容字段）：</div>
      ${warningsHtml}
    </div>
  `;
}

// Parse user-uploaded real local JSON/YAML file in browser for live prototype preview
function handleLocalFileUpload(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const raw = String(reader.result || "");
    let detected = "未知格式 (Unrecognized)";
    let projName = file.name.replace(/\.(json|yaml|yml)$/i, "");
    let reqCount = 0;
    let folderCount = 1;
    let blocked = false;
    const warnings = [];
    const parsedReqs = [];

    try {
      const obj = JSON.parse(raw);
      if (obj.openapi && String(obj.openapi).startsWith("3.")) {
        detected = `OpenAPI ${obj.openapi} (JSON)`;
        projName = obj.info?.title || projName;
        const paths = obj.paths || {};
        Object.entries(paths).forEach(([pKey, methodsObj]) => {
          Object.entries(methodsObj || {}).forEach(([mKey, op]) => {
            const upper = mKey.toUpperCase();
            if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(upper)) {
              reqCount++;
              parsedReqs.push({
                id: "req_up_" + reqCount,
                folderId: "fld_up_1",
                name: op.summary || op.operationId || `${upper} ${pKey}`,
                method: upper,
                path: `{{baseUrl}}${pKey}`,
                sourceId: op.operationId || `oas_${reqCount}`,
                dirty: false,
                params: [],
                headers: [{ enabled: true, key: "Content-Type", value: "application/json", isSecret: false }],
                bodyMode: upper === "GET" ? "none" : "raw-json",
                bodyText: upper === "GET" ? "" : "{\n  \n}",
                auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
                assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
              });
            }
          });
        });
        warnings.push({ level: "warn", code: "W_LOCAL_FILE_VERIFIED", msg: `已成功解析本机文件 ${file.name}，共提取 ${reqCount} 个标准接口。` });
      } else if (obj.swagger === "2.0") {
        detected = "Swagger 2.0 (JSON)";
        projName = obj.info?.title || projName;
        reqCount = Object.keys(obj.paths || {}).length;
        warnings.push({ level: "warn", code: "W_SWAGGER2_HOST", msg: "已将 Swagger 2.0 host + basePath 转换为候选环境 baseUrl。" });
      } else {
        detected = "Apifox / 自定义 JSON (待样本特征核验)";
        warnings.push({ level: "warn", code: "W_UNKNOWN_TOP_KEYS", msg: `检测到顶层键: ${Object.keys(obj).slice(0, 6).join(", ")}。未匹配固定 OpenAPI 字段，已按安全策略提示。` });
      }
    } catch (e) {
      if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
        detected = "YAML 文档 (OpenAPI / Swagger)";
        reqCount = 2;
        warnings.push({ level: "warn", code: "W_YAML_PARSED", msg: `已读取本机 YAML 文件 (${file.size} bytes)，由 Rust serde_yaml 分发器处理。` });
      } else {
        blocked = true;
        warnings.push({ level: "error", code: "E_INVALID_SYNTAX", msg: `文件解析失败：非合法的 JSON 结构，事务已拦截 (AC-11)。` });
      }
    }

    state.uploadedCustomPreview = {
      title: `本机文件: ${file.name}`,
      fileName: file.name,
      detectedFormat: detected,
      sha256: "local_" + file.size + "_bytes",
      projectName: projName,
      requestCount: reqCount,
      folderCount: folderCount,
      envCount: 2,
      blocked,
      warnings,
      folders: [{ id: "fld_up_1", name: "默认导入分组", collapsed: false }],
      requests:
        parsedReqs.length > 0
          ? parsedReqs
          : [
              {
                id: "req_up_demo",
                folderId: "fld_up_1",
                name: `${projName} 示例接口`,
                method: "GET",
                path: "{{baseUrl}}/api/health",
                sourceId: "healthCheck",
                dirty: false,
                params: [],
                headers: [],
                bodyMode: "none",
                bodyText: "",
                auth: { type: "none", token: "", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
                assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
              }
            ]
    };

    renderImportModalContent();
  };
  reader.readAsText(file);
}

// Environment & Variable Manager Modal (F05)
function openEnvModal() {
  const proj = getActiveProject();
  const env = getActiveEnv();
  const body = document.getElementById("envModalBody");

  const envRows = env.variables
    .map(
      (v, idx) => `
      <tr>
        <td><input class="kv-input" data-env-var-key="${idx}" value="${escapeHtml(v.key)}" /></td>
        <td>
          <input class="kv-input" type="${v.isSecret ? "password" : "text"}" data-env-var-val="${idx}" value="${escapeHtml(v.value)}" />
        </td>
        <td style="width: 130px;">
          <label style="font-size: 11px; cursor: pointer;">
            <input type="checkbox" data-env-var-secret="${idx}" ${v.isSecret ? "checked" : ""} /> 敏感凭据 (Secret)
          </label>
        </td>
      </tr>
    `
    )
    .join("");

  body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div>
        <div style="font-weight: 600;">当前编辑环境：${escapeHtml(env.name)}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">切换顶部环境选择器可分别配置开发、测试与生产环境</div>
      </div>
      <label style="font-size: 12px; color: var(--prod-hazard); cursor: pointer;">
        <input id="envIsProdCheckbox" type="checkbox" ${env.isProduction ? "checked" : ""} /> 标记为生产环境 (启用高危请求二次确认)
      </label>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <label style="width: 130px; color: var(--text-secondary);">前置 URL (<code class="mono">{{baseUrl}}</code>)：</label>
      <input id="envBaseUrlInput" class="search-input mono" value="${escapeHtml(env.baseUrl)}" />
    </div>

    <div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">当前环境变量表：</div>
      <table class="kv-table">
        <thead><tr><th>变量名 (Key)</th><th>变量值 (Value)</th><th>安全属性</th></tr></thead>
        <tbody>${envRows}</tbody>
      </table>
    </div>
  `;

  document.getElementById("envModalBackdrop").classList.remove("hidden");
}

// Wire up global event listeners
function initEvents() {
  // Project switcher
  document.getElementById("projectSelect").addEventListener("change", (e) => {
    state.activeProjectId = e.target.value;
    const proj = getActiveProject();
    state.openTabIds = proj.requests.slice(0, 2).map((r) => r.id);
    state.activeRequestId = state.openTabIds[0];
    renderAll();
    showToast(`已切换至项目：${proj.name}`);
  });

  // New empty project
  document.getElementById("btnNewProject").addEventListener("click", () => {
    const name = prompt("请输入新建本地项目名称：", "新微服务接口项目");
    if (!name || !name.trim()) return;
    const newId = "proj_" + Date.now();
    const firstReqId = "req_" + Date.now();
    state.projects.push({
      id: newId,
      name: name.trim(),
      sourceFormat: "manual",
      sourceHash: "local_sqlite",
      activeEnvId: "env_dev_" + newId,
      globalVars: [],
      environments: [
        {
          id: "env_dev_" + newId,
          name: "开发环境 (Dev)",
          isProduction: false,
          baseUrl: "http://127.0.0.1:3000",
          variables: [{ key: "token", value: "dev_sample_token", isSecret: true, enabled: true }]
        }
      ],
      folders: [{ id: "fld_default_" + newId, name: "默认模块", collapsed: false }],
      requests: [
        {
          id: firstReqId,
          folderId: "fld_default_" + newId,
          name: "健康检查接口",
          method: "GET",
          path: "{{baseUrl}}/healthz",
          sourceId: "healthz",
          dirty: false,
          params: [],
          headers: [],
          bodyMode: "none",
          bodyText: "",
          auth: { type: "none", token: "", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
          assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
        }
      ]
    });
    state.activeProjectId = newId;
    state.openTabIds = [firstReqId];
    state.activeRequestId = firstReqId;
    state.isFirstLaunchEmpty = false;
    renderAll();
    showToast(`已创建本地项目「${name.trim()}」`);
  });

  // Environment selector
  document.getElementById("envSelect").addEventListener("change", (e) => {
    const proj = getActiveProject();
    proj.activeEnvId = e.target.value;
    renderAll();
    const env = getActiveEnv();
    showToast(`已切换环境：${env.name} (${env.baseUrl})`);
  });

  // Theme toggle
  document.getElementById("btnThemeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
  });

  // Empty state toggle (AC-01)
  document.getElementById("btnToggleEmptyState").addEventListener("click", () => {
    state.isFirstLaunchEmpty = !state.isFirstLaunchEmpty;
    renderAll();
  });
  document.getElementById("emptyBtnLoadDemo").addEventListener("click", () => {
    state.isFirstLaunchEmpty = false;
    renderAll();
  });
  document.getElementById("emptyBtnImport").addEventListener("click", () => {
    openImportModal();
  });

  // Sidebar tabs
  document.getElementById("navTabTree").addEventListener("click", () => {
    state.sidebarTab = "tree";
    renderSidebar();
  });
  document.getElementById("navTabHistory").addEventListener("click", () => {
    state.sidebarTab = "history";
    renderSidebar();
  });

  // Search & Method filter
  document.getElementById("treeSearchInput").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderSidebar();
  });

  document.querySelectorAll("#methodFilterBar .filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#methodFilterBar .filter-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.methodFilter = btn.getAttribute("data-method");
      renderSidebar();
    });
  });

  // Add endpoint manually (F01)
  document.getElementById("btnAddEndpoint").addEventListener("click", () => {
    const proj = getActiveProject();
    const name = prompt("请输入新接口名称：", "新建业务接口");
    if (!name) return;
    const newReq = {
      id: "req_" + Date.now(),
      folderId: proj.folders[0].id,
      name: name.trim(),
      method: "GET",
      path: "{{baseUrl}}/api/v1/new-endpoint",
      sourceId: "manual_" + Date.now().toString().slice(-4),
      dirty: true,
      params: [],
      headers: [{ enabled: true, key: "Accept", value: "application/json", isSecret: false }],
      bodyMode: "none",
      bodyText: "",
      auth: { type: "bearer", token: "{{token}}", username: "", password: "", apiKeyHeader: "", apiKeyValue: "" },
      assertions: [{ enabled: true, expr: "status == 200", target: "HTTP 200" }]
    };
    proj.requests.push(newReq);
    openRequestTab(newReq.id);
    showToast("已新建接口并打开编辑标签页");
  });

  // Request Method & Path edit
  document.getElementById("reqMethodSelect").addEventListener("change", (e) => {
    const req = getActiveRequest();
    if (!req) return;
    req.method = e.target.value;
    req.dirty = true;
    renderAll();
  });

  document.getElementById("reqPathInput").addEventListener("input", (e) => {
    const req = getActiveRequest();
    if (!req) return;
    req.path = e.target.value;
    req.dirty = true;
    renderRequestPane();
  });

  // Request sub-tabs
  document.querySelectorAll("#reqSubTabs .sec-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.reqSubTab = btn.getAttribute("data-subtab");
      renderRequestPane();
    });
  });

  // Response sub-tabs
  document.querySelectorAll("#respSubTabs .sec-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.respSubTab = btn.getAttribute("data-resptab");
      renderResponsePane();
    });
  });

  // Send / Save / Duplicate buttons
  document.getElementById("btnSendRequest").addEventListener("click", () => triggerSendRequest(false));

  document.getElementById("btnSaveRequest").addEventListener("click", () => {
    const req = getActiveRequest();
    if (!req) return;
    req.dirty = false;
    renderAll();
    showToast(`已保存接口「${req.name}」到本地 SQLite 数据库`);
  });

  document.getElementById("btnDuplicateRequest").addEventListener("click", () => {
    const proj = getActiveProject();
    const req = getActiveRequest();
    if (!req) return;
    const copy = JSON.parse(JSON.stringify(req));
    copy.id = "req_copy_" + Date.now();
    copy.name = req.name + " (副本)";
    copy.dirty = true;
    proj.requests.push(copy);
    openRequestTab(copy.id);
    showToast(`已复制接口：${copy.name}`);
  });

  // Response Copy & cURL export (F04 / AC-13)
  document.getElementById("btnCopyResp").addEventListener("click", () => {
    navigator.clipboard?.writeText(JSON.stringify(state.lastResponse.bodyObj, null, 2));
    showToast("已复制响应 JSON 到剪贴板");
  });

  document.getElementById("btnCopyCurl").addEventListener("click", () => {
    const req = getActiveRequest();
    if (!req) return;
    const url = buildResolvedUrl(req, true).url;
    const curl = `curl -X ${req.method} '${url}' \\\n  -H 'Authorization: Bearer ****** (REDACTED)' \\\n  -H 'Content-Type: application/json'`;
    navigator.clipboard?.writeText(curl);
    showToast("已复制脱敏 cURL 命令（Authorization 与敏感变量已自动遮罩）");
  });

  document.getElementById("btnSaveRespFile").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.lastResponse.bodyObj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lightapi_response_${Date.now()}.json`;
    a.click();
    showToast("已将响应内容导出为本地 JSON 文件");
  });

  // Import Wizard Modal events
  document.getElementById("btnImportWizard").addEventListener("click", openImportModal);
  document.getElementById("btnCloseImportModal").addEventListener("click", () => {
    document.getElementById("importModalBackdrop").classList.add("hidden");
  });
  document.getElementById("btnCancelImport").addEventListener("click", () => {
    document.getElementById("importModalBackdrop").classList.add("hidden");
  });
  document.getElementById("localFileInput").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleLocalFileUpload(e.target.files[0]);
    }
  });

  document.getElementById("btnCommitImport").addEventListener("click", () => {
    const preview = state.uploadedCustomPreview || IMPORT_FIXTURES[state.selectedFixtureKey];
    if (!preview || preview.blocked) return;

    const policy = document.getElementById("importConflictPolicy").value;
    if (policy === "new_project") {
      const newProjId = "proj_imp_" + Date.now();
      const clonedReqs = JSON.parse(JSON.stringify(preview.requests));
      const clonedFolders = JSON.parse(JSON.stringify(preview.folders));
      state.projects.push({
        id: newProjId,
        name: preview.projectName,
        sourceFormat: preview.detectedFormat,
        sourceHash: preview.sha256,
        activeEnvId: "env_imp_dev",
        globalVars: [],
        environments: [
          {
            id: "env_imp_dev",
            name: "导入默认环境 (Dev)",
            isProduction: false,
            baseUrl: "https://sandbox.api.internal",
            variables: [{ key: "token", value: "imported_sandbox_token_01", isSecret: true, enabled: true }]
          },
          {
            id: "env_imp_prod",
            name: "导入生产环境 (Prod)",
            isProduction: true,
            baseUrl: "https://prod.api.internal",
            variables: [{ key: "token", value: "imported_prod_secret", isSecret: true, enabled: true }]
          }
        ],
        folders: clonedFolders,
        requests: clonedReqs
      });
      state.activeProjectId = newProjId;
      state.openTabIds = clonedReqs.slice(0, 2).map((r) => r.id);
      state.activeRequestId = state.openTabIds[0];
    } else {
      // Merge into active project without overwriting dirty local requests (AC-10)
      const proj = getActiveProject();
      preview.folders.forEach((f) => {
        if (!proj.folders.some((ef) => ef.id === f.id)) {
          proj.folders.push(JSON.parse(JSON.stringify(f)));
        }
      });
      preview.requests.forEach((r) => {
        const existing = proj.requests.find((er) => er.sourceId === r.sourceId);
        if (!existing) {
          proj.requests.push(JSON.parse(JSON.stringify(r)));
        } else if (policy === "update_unmodified" && !existing.dirty) {
          Object.assign(existing, JSON.parse(JSON.stringify(r)));
        }
      });
    }

    state.isFirstLaunchEmpty = false;
    document.getElementById("importModalBackdrop").classList.add("hidden");
    renderAll();
    showToast(`SQLite 事务导入完成：共导入 ${preview.requestCount} 个接口`);
  });

  // Environment Modal events
  document.getElementById("btnEnvManager").addEventListener("click", openEnvModal);
  document.getElementById("btnCloseEnvModal").addEventListener("click", () => {
    document.getElementById("envModalBackdrop").classList.add("hidden");
  });
  document.getElementById("btnSaveEnvModal").addEventListener("click", () => {
    const env = getActiveEnv();
    const baseIn = document.getElementById("envBaseUrlInput");
    const prodCheck = document.getElementById("envIsProdCheckbox");
    if (baseIn) env.baseUrl = baseIn.value.trim();
    if (prodCheck) env.isProduction = prodCheck.checked;

    document.querySelectorAll("[data-env-var-key]").forEach((el) => {
      const idx = Number(el.getAttribute("data-env-var-key"));
      env.variables[idx].key = el.value.trim();
    });
    document.querySelectorAll("[data-env-var-val]").forEach((el) => {
      const idx = Number(el.getAttribute("data-env-var-val"));
      env.variables[idx].value = el.value;
    });
    document.querySelectorAll("[data-env-var-secret]").forEach((el) => {
      const idx = Number(el.getAttribute("data-env-var-secret"));
      env.variables[idx].isSecret = el.checked;
    });

    document.getElementById("envModalBackdrop").classList.add("hidden");
    renderAll();
    showToast(`已更新环境「${env.name}」配置`);
  });

  // Production High-Risk Confirm Modal (AC-12)
  document.getElementById("btnCloseProdModal").addEventListener("click", () => {
    document.getElementById("prodConfirmModalBackdrop").classList.add("hidden");
  });
  document.getElementById("btnCancelProdSend").addEventListener("click", () => {
    document.getElementById("prodConfirmModalBackdrop").classList.add("hidden");
  });
  document.getElementById("btnConfirmProdSend").addEventListener("click", () => {
    document.getElementById("prodConfirmModalBackdrop").classList.add("hidden");
    triggerSendRequest(true);
  });

  // Global keyboard shortcuts (4.2: Ctrl+Enter Send, Ctrl+S Save, Ctrl+F Search)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      triggerSendRequest(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      document.getElementById("btnSaveRequest").click();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      state.sidebarTab = "tree";
      renderSidebar();
      document.getElementById("treeSearchInput").focus();
    } else if (e.key === "Escape") {
      document.getElementById("importModalBackdrop").classList.add("hidden");
      document.getElementById("envModalBackdrop").classList.add("hidden");
      document.getElementById("prodConfirmModalBackdrop").classList.add("hidden");
    }
  });
}

// Initialize Prototype
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  renderAll();
});
