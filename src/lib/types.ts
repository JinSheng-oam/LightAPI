export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | string;

export interface CanonicalProject {
  id: string;
  name: string;
  description?: string | null;
  source_format?: string | null;
  source_file_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanonicalFolder {
  id: string;
  project_id: string;
  parent_id?: string | null;
  name: string;
  sort_order: number;
  source_id?: string | null;
}

export interface ParamItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string | null;
  param_type: string; // 'query' | 'path' | 'header'
}

export interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string | null;
}

export type BodyMode = 'none' | 'raw-json' | 'raw-text' | 'urlencoded' | 'form-data';

export interface FormDataItem {
  key: string;
  value: string;
  item_type: string; // 'text' | 'file'
  enabled: boolean;
}

export interface RequestBody {
  mode: BodyMode;
  raw?: string | null;
  form_data: FormDataItem[];
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface RequestAuth {
  auth_type: AuthType;
  token?: string | null;
  username?: string | null;
  password?: string | null;
  key?: string | null;
  value?: string | null;
  add_to?: string | null; // 'header' | 'query'
}

export interface CanonicalRequest {
  id: string;
  project_id: string;
  folder_id?: string | null;
  name: string;
  method: HttpMethod;
  path: string;
  description?: string | null;
  params: ParamItem[];
  headers: HeaderItem[];
  body: RequestBody;
  auth: RequestAuth;
  source_id?: string | null;
  source_fingerprint?: string | null;
  locally_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Variable {
  key: string;
  value: string;
  is_secret: boolean;
  enabled: boolean;
  description?: string | null;
}

export interface BaseUrlItem {
  key: string;
  url: string;
  description?: string | null;
  enabled: boolean;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  base_urls: BaseUrlItem[];
  variables: Variable[];
  is_production: boolean;
}

export interface RequestHistory {
  id: string;
  project_id: string;
  request_id: string;
  environment_id?: string | null;
  requested_at: string;
  method: string;
  status: number;
  duration_ms: number;
  size_bytes: number;
  url_redacted: string;
  error_code?: string | null;
}

export interface ImportWarning {
  code: string;
  message: string;
  location?: string | null;
}

export interface ImportPreview {
  detected_format: string;
  project_name: string;
  request_count: number;
  folder_count: number;
  environment_count: number;
  warnings: ImportWarning[];
}

export interface ImportReport {
  detected_format: string;
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  warnings: ImportWarning[];
}

export interface ExecuteRequestInput {
  execution_id?: string | null;
  url: string;
  method: HttpMethod;
  params: ParamItem[];
  headers: HeaderItem[];
  body: RequestBody;
  auth: RequestAuth;
  timeout_ms?: number | null;
}

export interface ExecuteResponseOutput {
  status: number;
  status_text: string;
  duration_ms: number;
  size_bytes: number;
  headers: [string, string][];
  body_preview: string;
  body_truncated: boolean;
  content_type?: string | null;
  redacted_url: string;
}
