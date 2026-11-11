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
