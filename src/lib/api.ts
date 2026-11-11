import { invoke } from '@tauri-apps/api/core';
import type {
  CanonicalFolder,
  CanonicalProject,
  CanonicalRequest,
  Environment,
  ExecuteRequestInput,
  ExecuteResponseOutput,
  ImportPreview,
  ImportReport,
  RequestHistory,
} from './types';

export const api = {
  // Projects
  createProject: (name: string) =>
    invoke<CanonicalProject>('create_project', { name }),
  listProjects: () =>
    invoke<CanonicalProject[]>('list_projects'),
  deleteProject: (id: string) =>
    invoke<void>('delete_project', { id }),

  // Folders
  listFolders: (projectId: string) =>
    invoke<CanonicalFolder[]>('list_folders', { projectId }),
  saveFolder: (folder: CanonicalFolder) =>
    invoke<void>('save_folder', { folder }),
  deleteFolder: (id: string) =>
    invoke<void>('delete_folder', { id }),

  // Requests
  listRequests: (projectId: string) =>
    invoke<CanonicalRequest[]>('list_requests', { projectId }),
  saveRequest: (request: CanonicalRequest) =>
    invoke<CanonicalRequest>('save_request', { request }),
  deleteRequest: (id: string) =>
    invoke<void>('delete_request', { id }),

  // Environments
  listEnvironments: (projectId: string) =>
    invoke<Environment[]>('list_environments', { projectId }),
  saveEnvironment: (env: Environment) =>
    invoke<void>('save_environment', { env }),
  deleteEnvironment: (id: string) =>
    invoke<void>('delete_environment', { id }),

  // Execution
  executeRequest: (args: {
    projectId?: string;
    requestId?: string;
    environmentId?: string;
    input: ExecuteRequestInput;
  }) =>
    invoke<ExecuteResponseOutput>('execute_request', {
      projectId: args.projectId,
      requestId: args.requestId,
      environmentId: args.environmentId,
      input: args.input,
    }),

  // History
  listHistory: (projectId: string, limit?: number) =>
    invoke<RequestHistory[]>('list_history', { projectId, limit }),
  clearHistory: (projectId: string) =>
    invoke<void>('clear_history', { projectId }),

  // Import
  previewImport: (content: string, fileName: string) =>
    invoke<ImportPreview>('preview_import', { content, fileName }),
  commitImport: (content: string, fileName: string) =>
    invoke<ImportReport>('commit_import', { content, fileName }),
};
