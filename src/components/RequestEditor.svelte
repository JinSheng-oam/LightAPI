<script lang="ts">
  import {
    activeRequest,
    currentProject,
    currentEnvironment,
    activeResponse,
    isExecuting,
    executionError,
    resolveVariables,
    requests,
  } from '../stores/appStore';
  import { api } from '../lib/api';
  import type { ExecuteRequestInput } from '../lib/types';

  let currentSubTab: 'params' | 'headers' | 'body' | 'auth' = $state('params');

  let resolvedUrlPreview = $derived(
    $activeRequest
      ? resolveVariables($activeRequest.path, $currentEnvironment)
      : ''
  );

  async function saveCurrentRequest() {
    if (!$activeRequest) return;
    try {
      const saved = await api.saveRequest($activeRequest);
      requests.update((list) => list.map((r) => (r.id === saved.id ? saved : r)));
      activeRequest.set(saved);
    } catch (e) {
      alert(`保存请求失败: ${e}`);
    }
  }

  async function executeCurrentRequest() {
    if (!$activeRequest || !$currentProject) return;

    // Safety check for production environment
    if (
      $currentEnvironment?.is_production &&
      !['GET', 'HEAD', 'OPTIONS'].includes($activeRequest.method.toUpperCase())
    ) {
      const ok = confirm(
        `【生产环境安全保护】当前处于生产环境，即将发送具有副作用的 ${$activeRequest.method} 请求到:\n${resolvedUrlPreview}\n是否确认执行？`
      );
      if (!ok) return;
    }

    isExecuting.set(true);
    executionError.set(null);

    try {
      // 1. Resolve variables in URL, headers, and params
      const finalUrl = resolveVariables($activeRequest.path, $currentEnvironment);

      const resolvedParams = $activeRequest.params.map((p) => ({
        ...p,
        value: resolveVariables(p.value, $currentEnvironment),
      }));

      const resolvedHeaders = $activeRequest.headers.map((h) => ({
        ...h,
        value: resolveVariables(h.value, $currentEnvironment),
      }));

      let resolvedBodyRaw = $activeRequest.body.raw
        ? resolveVariables($activeRequest.body.raw, $currentEnvironment)
        : null;

      const input: ExecuteRequestInput = {
        execution_id: crypto.randomUUID(),
        url: finalUrl,
        method: $activeRequest.method,
        params: resolvedParams,
        headers: resolvedHeaders,
        body: {
          ...$activeRequest.body,
          raw: resolvedBodyRaw,
        },
        auth: $activeRequest.auth,
        timeout_ms: 30000,
      };

      const resp = await api.executeRequest({
        projectId: $currentProject.id,
        requestId: $activeRequest.id,
        environmentId: $currentEnvironment?.id,
        input,
      });

      activeResponse.set(resp);
    } catch (err: any) {
      executionError.set(err?.message || String(err));
      activeResponse.set(null);
    } finally {
      isExecuting.set(false);
    }
  }

  function addParamRow() {
    if (!$activeRequest) return;
    $activeRequest.params.push({
      key: '',
      value: '',
      enabled: true,
      description: '',
      param_type: 'query',
    });
    activeRequest.set($activeRequest);
  }

  function removeParamRow(index: number) {
    if (!$activeRequest) return;
    $activeRequest.params.splice(index, 1);
    activeRequest.set($activeRequest);
  }

  function addHeaderRow() {
    if (!$activeRequest) return;
    $activeRequest.headers.push({
      key: '',
      value: '',
      enabled: true,
      description: '',
    });
    activeRequest.set($activeRequest);
  }

  function removeHeaderRow(index: number) {
    if (!$activeRequest) return;
    $activeRequest.headers.splice(index, 1);
    activeRequest.set($activeRequest);
  }

  function formatJsonBody() {
    if (!$activeRequest || !$activeRequest.body.raw) return;
    try {
      const parsed = JSON.parse($activeRequest.body.raw);
      $activeRequest.body.raw = JSON.stringify(parsed, null, 2);
      activeRequest.set($activeRequest);
    } catch {
      alert('JSON 语法错误，无法自动格式化');
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeCurrentRequest();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentRequest();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if !$activeRequest}
  <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 14px;">
    从左侧目录选择或新建一个接口进行调试
  </div>
{:else}
  <section class="editor-panel">
    <!-- Title and Description Bar -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <input
        type="text"
        class="ctrl-input"
        style="font-size: 15px; font-weight: 600; background: transparent; border: 1px solid transparent; width: 320px;"
        bind:value={$activeRequest.name}
        placeholder="接口名称"
        onchange={saveCurrentRequest}
      />
      <div style="display: flex; gap: 8px;">
        <button class="ctrl-btn" onclick={saveCurrentRequest} title="保存接口 (Ctrl+S)">
          保存
        </button>
      </div>
    </div>

    <!-- URL and Method Bar -->
    <div class="url-bar">
      <select class="method-select" bind:value={$activeRequest.method}>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
        <option value="PATCH">PATCH</option>
        <option value="HEAD">HEAD</option>
        <option value="OPTIONS">OPTIONS</option>
      </select>

      <input
        type="text"
        class="url-input"
        bind:value={$activeRequest.path}
        placeholder="请求路径或完整 URL，支持变量插值"
      />

      <button
        class="btn-send"
        disabled={$isExecuting}
        onclick={executeCurrentRequest}
        title="发送真实请求 (Ctrl+Enter)"
      >
        {$isExecuting ? '发送中...' : '发送'}
      </button>
    </div>

    {#if resolvedUrlPreview && resolvedUrlPreview !== $activeRequest.path}
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; font-family: monospace;">
        解析后目标: {resolvedUrlPreview}
      </div>
    {/if}

    <!-- Tab navigation -->
    <div class="tab-nav">
      <button
        class="tab-btn"
        class:active={currentSubTab === 'params'}
        onclick={() => (currentSubTab = 'params')}
      >
        Params ({$activeRequest.params.length})
      </button>
      <button
        class="tab-btn"
        class:active={currentSubTab === 'headers'}
        onclick={() => (currentSubTab = 'headers')}
      >
        Headers ({$activeRequest.headers.length})
      </button>
      <button
        class="tab-btn"
        class:active={currentSubTab === 'body'}
        onclick={() => (currentSubTab = 'body')}
      >
        Body ({$activeRequest.body.mode})
      </button>
      <button
        class="tab-btn"
        class:active={currentSubTab === 'auth'}
        onclick={() => (currentSubTab = 'auth')}
      >
        Auth ({$activeRequest.auth.auth_type})
      </button>
    </div>

    <!-- SubTab: Params -->
    {#if currentSubTab === 'params'}
      <div class="subtab-content">
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 36px;"></th>
              <th style="width: 80px;">类型</th>
              <th>参数名 (Key)</th>
              <th>参数值 (Value)</th>
              <th>说明</th>
              <th style="width: 40px;"></th>
            </tr>
          </thead>
          <tbody>
            {#each $activeRequest.params as p, idx}
              <tr class="kv-row">
                <td style="text-align: center;">
                  <input type="checkbox" bind:checked={p.enabled} />
                </td>
                <td>
                  <select bind:value={p.param_type} class="ctrl-select" style="padding: 2px 4px; font-size: 11px;">
                    <option value="query">Query</option>
                    <option value="path">Path</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="kv-key" bind:value={p.key} placeholder="key" />
                </td>
                <td>
                  <input type="text" class="kv-val" bind:value={p.value} placeholder="value" />
                </td>
                <td>
                  <input type="text" class="kv-val" bind:value={p.description} placeholder="说明" />
                </td>
                <td>
                  <button class="kv-del" onclick={() => removeParamRow(idx)}>×</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <button class="ctrl-btn ghost" style="margin-top: 8px; font-size: 12px;" onclick={addParamRow}>
          + 添加参数
        </button>
      </div>
    {/if}

    <!-- SubTab: Headers -->
    {#if currentSubTab === 'headers'}
      <div class="subtab-content">
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 36px;"></th>
              <th>请求头 (Header)</th>
              <th>值 (Value)</th>
              <th>说明</th>
              <th style="width: 40px;"></th>
            </tr>
          </thead>
          <tbody>
            {#each $activeRequest.headers as h, idx}
              <tr class="kv-row">
                <td style="text-align: center;">
                  <input type="checkbox" bind:checked={h.enabled} />
                </td>
                <td>
                  <input type="text" class="kv-key" bind:value={h.key} placeholder="Header-Name" />
                </td>
                <td>
                  <input type="text" class="kv-val" bind:value={h.value} placeholder="Value" />
                </td>
                <td>
                  <input type="text" class="kv-val" bind:value={h.description} placeholder="说明" />
                </td>
                <td>
                  <button class="kv-del" onclick={() => removeHeaderRow(idx)}>×</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <button class="ctrl-btn ghost" style="margin-top: 8px; font-size: 12px;" onclick={addHeaderRow}>
          + 添加请求头
        </button>
      </div>
    {/if}

    <!-- SubTab: Body -->
    {#if currentSubTab === 'body'}
      <div class="subtab-content">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; gap: 12px; font-size: 12px;">
            <label><input type="radio" bind:group={$activeRequest.body.mode} value="none" /> none</label>
            <label><input type="radio" bind:group={$activeRequest.body.mode} value="raw-json" /> raw (JSON)</label>
            <label><input type="radio" bind:group={$activeRequest.body.mode} value="raw-text" /> raw (Text)</label>
            <label><input type="radio" bind:group={$activeRequest.body.mode} value="urlencoded" /> x-www-form-urlencoded</label>
          </div>
          {#if $activeRequest.body.mode === 'raw-json'}
            <button class="ctrl-btn ghost" style="font-size: 11px; padding: 2px 6px;" onclick={formatJsonBody}>
              格式化 JSON
            </button>
          {/if}
        </div>

        {#if $activeRequest.body.mode === 'none'}
          <div style="color: var(--text-muted); font-size: 12px; padding: 20px; text-align: center;">
            该请求没有 Body 请求体
          </div>
        {:else if $activeRequest.body.mode === 'raw-json' || $activeRequest.body.mode === 'raw-text'}
          <textarea
            class="code-textarea"
            bind:value={$activeRequest.body.raw}
            placeholder="在此输入请求体内容，支持变量替换"
            rows="10"
          ></textarea>
        {:else}
          <div style="color: var(--text-muted); font-size: 12px; padding: 10px;">
            Form-Urlencoded 模式
          </div>
        {/if}
      </div>
    {/if}

    <!-- SubTab: Auth -->
    {#if currentSubTab === 'auth'}
      <div class="subtab-content" style="max-width: 500px;">
        <div style="margin-bottom: 12px;">
          <label for="authTypeSelect" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">认证方式</label>
          <select id="authTypeSelect" class="ctrl-select" bind:value={$activeRequest.auth.auth_type}>
            <option value="none">No Auth (无认证)</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api-key">API Key</option>
          </select>
        </div>

        {#if $activeRequest.auth.auth_type === 'bearer'}
          <div>
            <label for="bearerTokenInput" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">Token</label>
            <input
              id="bearerTokenInput"
              type="password"
              class="ctrl-input"
              style="width: 100%;"
              bind:value={$activeRequest.auth.token}
              placeholder="eyJhbGciOi..."
            />
          </div>
        {:else if $activeRequest.auth.auth_type === 'basic'}
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1;">
              <label for="basicUsernameInput" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">Username</label>
              <input id="basicUsernameInput" type="text" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.username} />
            </div>
            <div style="flex: 1;">
              <label for="basicPasswordInput" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">Password</label>
              <input id="basicPasswordInput" type="password" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.password} />
            </div>
          </div>
        {:else if $activeRequest.auth.auth_type === 'api-key'}
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <div style="flex: 1;">
              <label for="apiKeyNameInput" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">Key</label>
              <input id="apiKeyNameInput" type="text" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.key} placeholder="X-Api-Key" />
            </div>
            <div style="flex: 1;">
              <label for="apiKeyValueInput" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">Value</label>
              <input id="apiKeyValueInput" type="password" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.value} />
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}
