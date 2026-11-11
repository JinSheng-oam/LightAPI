import { writable, get } from 'svelte/store';
import { api } from '../lib/api';
import type {
  CanonicalFolder,
  CanonicalProject,
  CanonicalRequest,
  Environment,
  ExecuteResponseOutput,
} from '../lib/types';

export const projects = writable<CanonicalProject[]>([]);
export const currentProject = writable<CanonicalProject | null>(null);

export const folders = writable<CanonicalFolder[]>([]);
export const requests = writable<CanonicalRequest[]>([]);
export const activeRequest = writable<CanonicalRequest | null>(null);

export const environments = writable<Environment[]>([]);
export const currentEnvironment = writable<Environment | null>(null);

export const activeResponse = writable<ExecuteResponseOutput | null>(null);
export const isExecuting = writable<boolean>(false);
export const executionError = writable<string | null>(null);

export const theme = writable<'dark' | 'light'>('dark');

export const showImportModal = writable<boolean>(false);
export const showEnvModal = writable<boolean>(false);
export const showNewProjectModal = writable<boolean>(false);

// Helper function to resolve variable placeholders e.g. {{baseUrl}}
export function resolveVariables(template: string, env: Environment | null): string {
  if (!env || !template) return template;
  let resolved = template;

  // 1. Resolve {{baseUrl}} from default base URL if present
  if (env.base_urls && env.base_urls.length > 0) {
    const defaultUrl = env.base_urls.find((u) => u.enabled)?.url || env.base_urls[0].url;
    resolved = resolved.replace(/\{\{baseUrl\}\}/g, defaultUrl.replace(/\/+$/, ''));
  }

  // 2. Resolve custom variables
  for (const v of env.variables.filter((v) => v.enabled)) {
    const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
    resolved = resolved.replace(pattern, v.value);
  }

  return resolved;
}

// App initialization loader
export async function loadInitialData() {
  try {
    const list = await api.listProjects();
    projects.set(list);

    if (list.length > 0) {
      const first = list[0];
      currentProject.set(first);
      await loadProjectDetails(first.id);
    } else {
      currentProject.set(null);
      folders.set([]);
      requests.set([]);
      activeRequest.set(null);
      environments.set([]);
      currentEnvironment.set(null);
    }
  } catch (e) {
    console.error('Failed to load initial data:', e);
  }
}

export async function loadProjectDetails(projectId: string) {
  try {
    const [fList, rList, eList] = await Promise.all([
      api.listFolders(projectId),
      api.listRequests(projectId),
      api.listEnvironments(projectId),
    ]);

    folders.set(fList);
    requests.set(rList);
    environments.set(eList);

    if (eList.length > 0) {
      currentEnvironment.set(eList[0]);
    } else {
      currentEnvironment.set(null);
    }

    if (rList.length > 0) {
      activeRequest.set(rList[0]);
    } else {
      activeRequest.set(null);
    }
  } catch (e) {
    console.error('Failed to load project details:', e);
  }
}

export async function loadSampleDemoProject() {
  try {
    const proj = await api.createProject('核心交易与支付网关（示例）');

    // 1. Create Environment
    const devEnv: Environment = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      name: '开发环境 (Dev)',
      base_urls: [
        {
          key: 'gateway',
          url: 'https://httpbin.org',
          description: '主服务网关',
          enabled: true,
        },
      ],
      variables: [
        {
          key: 'apiKey',
          value: 'key_live_9921_mock_secret',
          is_secret: true,
          enabled: true,
          description: '身份认证密钥',
        },
        {
          key: 'apiVersion',
          value: 'v2',
          is_secret: false,
          enabled: true,
          description: 'API版本',
        },
      ],
      is_production: false,
    };
    await api.saveEnvironment(devEnv);

    // 2. Create Folders
    const folderUser: CanonicalFolder = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      parent_id: null,
      name: '用户与鉴权中心',
      sort_order: 1,
    };
    const folderPay: CanonicalFolder = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      parent_id: null,
      name: '交易与支付模块',
      sort_order: 2,
    };
    await api.saveFolder(folderUser);
    await api.saveFolder(folderPay);

    // 3. Create Requests
    const req1: CanonicalRequest = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      folder_id: folderUser.id,
      name: '获取当前登录用户信息',
      method: 'GET',
      path: '{{baseUrl}}/get?userId=1001&scope=profile',
      description: '查询当前活跃用户的详细属性与权限角色',
      params: [
        { key: 'userId', value: '1001', enabled: true, param_type: 'query', description: '用户ID' },
        { key: 'scope', value: 'profile', enabled: true, param_type: 'query', description: '查询范围' },
      ],
      headers: [
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'X-Api-Key', value: '{{apiKey}}', enabled: true, description: '调用凭据' },
      ],
      body: { mode: 'none', raw: null, form_data: [] },
      auth: { auth_type: 'none' },
      locally_modified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const req2: CanonicalRequest = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      folder_id: folderPay.id,
      name: '创建收单交易订单',
      method: 'POST',
      path: '{{baseUrl}}/post',
      description: '向收单通道发起一笔新的结算交易',
      params: [],
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Api-Key', value: '{{apiKey}}', enabled: true },
      ],
      body: {
        mode: 'raw-json',
        raw: JSON.stringify(
          {
            order_id: 'ORD-2026-X889',
            amount: 299.5,
            currency: 'CNY',
            channel: 'alipay_native',
            metadata: { user_id: 1001, ip: '127.0.0.1' },
          },
          null,
          2
        ),
        form_data: [],
      },
      auth: { auth_type: 'none' },
      locally_modified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const req3: CanonicalRequest = {
      id: crypto.randomUUID(),
      project_id: proj.id,
      folder_id: null,
      name: '网关健康状态探针 (Health)',
      method: 'GET',
      path: 'https://httpbin.org/status/200',
      description: '零变量快速健康检查接口',
      params: [],
      headers: [],
      body: { mode: 'none', raw: null, form_data: [] },
      auth: { auth_type: 'none' },
      locally_modified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await Promise.all([
      api.saveRequest(req1),
      api.saveRequest(req2),
      api.saveRequest(req3),
    ]);

    await loadInitialData();
  } catch (e) {
    alert(`加载示例项目失败: ${e}`);
  }
}
