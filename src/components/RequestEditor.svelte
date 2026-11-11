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
  import CustomSelect, { type SelectOption } from './CustomSelect.svelte';

  const methodOptions: SelectOption[] = [
    { value: 'GET', label: 'GET', colorClass: 'text-GET' },
    { value: 'POST', label: 'POST', colorClass: 'text-POST' },
    { value: 'PUT', label: 'PUT', colorClass: 'text-PUT' },
    { value: 'DELETE', label: 'DELETE', colorClass: 'text-DELETE' },
    { value: 'PATCH', label: 'PATCH', colorClass: 'text-PATCH' },
    { value: 'HEAD', label: 'HEAD', colorClass: 'text-HEAD' },
    { value: 'OPTIONS', label: 'OPTIONS', colorClass: 'text-OPTIONS' },
  ];

  const paramTypeOptions: SelectOption[] = [
    { value: 'query', label: 'Query' },
    { value: 'path', label: 'Path' },
  ];

  const authTypeOptions: SelectOption[] = [
    { value: 'none', label: 'No Auth (无认证)' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'api-key', label: 'API Key' },
  ];

  let currentSubTab: 'params' | 'headers' | 'body' | 'auth' = $state('params');
  let saveFeedback = $state(false);

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
      saveFeedback = true;
      setTimeout(() => (saveFeedback = false), 1500);
    } catch (e) {
      alert(`保存请求失败: ${e}`);
    }
  }

  async function executeCurrentRequest() {
    if (!$activeRequest || !$currentProject) return;

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

  function addFormDataRow() {
    if (!$activeRequest) return;
    if (!$activeRequest.body.form_data) {
      $activeRequest.body.form_data = [];
    }
    $activeRequest.body.form_data.push({
      key: '',
      value: '',
      item_type: 'text',
      enabled: true,
      description: '',
    });
    activeRequest.set($activeRequest);
  }

  function removeFormDataRow(index: number) {
    if (!$activeRequest || !$activeRequest.body.form_data) return;
    $activeRequest.body.form_data.splice(index, 1);
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
  <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
    从左侧目录选择或新建一个接口
  </div>
{:else}
  <section class="editor-panel">
    <!-- Title and Save Bar -->
    <div class="req-header-bar">
      <input
        type="text"
        class="req-title-input"
        bind:value={$activeRequest.name}
        placeholder="接口名称"
        onchange={saveCurrentRequest}
      />
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          class="ctrl-btn"
          onclick={saveCurrentRequest}
          title="保存接口 (Ctrl+S)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {saveFeedback ? '已保存' : '保存'}
        </button>
      </div>
    </div>

    <!-- Unified URL & Method Bar -->
    <div class="url-bar">
      <div class="url-composer">
        <CustomSelect
          bind:value={$activeRequest.method}
          options={methodOptions}
          variant="method"
          ariaLabel="HTTP 方法"
        />

        <input
          type="text"
          class="url-input"
          bind:value={$activeRequest.path}
          placeholder={"输入请求 URL 或使用 {{baseUrl}}/path"}
        />
      </div>

      <button
        type="button"
        class="btn-send"
        disabled={$isExecuting}
        onclick={executeCurrentRequest}
        title="发送请求 (Ctrl+Enter)"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        {$isExecuting ? '发送中...' : '发送'}
      </button>
    </div>

    {#if resolvedUrlPreview && resolvedUrlPreview !== $activeRequest.path}
      <div class="resolved-preview-bar">
        <span style="color: var(--text-muted);">目标地址:</span>
        <span style="color: var(--text-primary);">{resolvedUrlPreview}</span>
      </div>
    {/if}

    <!-- Tab navigation -->
    <div class="tab-nav" role="tablist" aria-label="请求配置分类">
      <button
        type="button"
        role="tab"
        id="req-tab-params"
        aria-controls="req-panel-params"
        aria-selected={currentSubTab === 'params'}
        tabindex={currentSubTab === 'params' ? 0 : -1}
        class="tab-btn"
        class:active={currentSubTab === 'params'}
        onclick={() => (currentSubTab = 'params')}
      >
        Params
        {#if $activeRequest.params.length > 0}
          <span class="tab-badge">{$activeRequest.params.length}</span>
        {/if}
      </button>
      <button
        type="button"
        role="tab"
        id="req-tab-headers"
        aria-controls="req-panel-headers"
        aria-selected={currentSubTab === 'headers'}
        tabindex={currentSubTab === 'headers' ? 0 : -1}
        class="tab-btn"
        class:active={currentSubTab === 'headers'}
        onclick={() => (currentSubTab = 'headers')}
      >
        Headers
        {#if $activeRequest.headers.length > 0}
          <span class="tab-badge">{$activeRequest.headers.length}</span>
        {/if}
      </button>
      <button
        type="button"
        role="tab"
        id="req-tab-body"
        aria-controls="req-panel-body"
        aria-selected={currentSubTab === 'body'}
        tabindex={currentSubTab === 'body' ? 0 : -1}
        class="tab-btn"
        class:active={currentSubTab === 'body'}
        onclick={() => (currentSubTab = 'body')}
      >
        Body
        {#if $activeRequest.body.mode !== 'none'}
          <span class="tab-badge">{$activeRequest.body.mode === 'raw-json' ? 'JSON' : $activeRequest.body.mode === 'raw-text' ? 'Text' : 'Form'}</span>
        {/if}
      </button>
      <button
        type="button"
        role="tab"
        id="req-tab-auth"
        aria-controls="req-panel-auth"
        aria-selected={currentSubTab === 'auth'}
        tabindex={currentSubTab === 'auth' ? 0 : -1}
        class="tab-btn"
        class:active={currentSubTab === 'auth'}
        onclick={() => (currentSubTab = 'auth')}
      >
        Auth
        {#if $activeRequest.auth.auth_type !== 'none'}
          <span class="tab-badge">{$activeRequest.auth.auth_type}</span>
        {/if}
      </button>
    </div>

    <!-- SubTab: Params -->
    {#if currentSubTab === 'params'}
      <div
        class="subtab-content"
        role="tabpanel"
        id="req-panel-params"
        aria-labelledby="req-tab-params"
        tabindex="0"
      >
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">启用</th>
              <th style="width: 96px;">类型</th>
              <th style="width: 30%;">参数名 (Key)</th>
              <th style="width: 35%;">参数值 (Value)</th>
              <th>说明</th>
              <th style="width: 38px;"></th>
            </tr>
          </thead>
          <tbody>
            {#if $activeRequest.params.length === 0}
              <tr>
                <td colspan="6" class="kv-empty-cell">暂无请求参数，点击下方「+ 添加参数」新增</td>
              </tr>
            {:else}
              {#each $activeRequest.params as p, idx}
                <tr class="kv-row">
                  <td style="text-align: center;">
                    <input type="checkbox" bind:checked={p.enabled} />
                  </td>
                  <td>
                    <CustomSelect
                      bind:value={p.param_type}
                      options={paramTypeOptions}
                      variant="compact"
                      ariaLabel="参数类型"
                    />
                  </td>
                  <td>
                    <input type="text" class="kv-key" bind:value={p.key} placeholder="参数名" />
                  </td>
                  <td>
                    <input type="text" class="kv-val" bind:value={p.value} placeholder="参数值" />
                  </td>
                  <td>
                    <input type="text" class="kv-val" bind:value={p.description} placeholder="可选说明" />
                  </td>
                  <td style="text-align: center;">
                    <button type="button" class="kv-del" onclick={() => removeParamRow(idx)} title="删除行">×</button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
        <button type="button" class="kv-add-inline" style="margin-top: 8px;" onclick={addParamRow}>
          + 添加参数
        </button>
      </div>
    {/if}

    <!-- SubTab: Headers -->
    {#if currentSubTab === 'headers'}
      <div
        class="subtab-content"
        role="tabpanel"
        id="req-panel-headers"
        aria-labelledby="req-tab-headers"
        tabindex="0"
      >
        <table class="kv-table">
          <thead>
            <tr>
              <th style="width: 44px; text-align: center;">启用</th>
              <th style="width: 34%;">请求头 (Header)</th>
              <th style="width: 38%;">值 (Value)</th>
              <th>说明</th>
              <th style="width: 38px;"></th>
            </tr>
          </thead>
          <tbody>
            {#if $activeRequest.headers.length === 0}
              <tr>
                <td colspan="5" class="kv-empty-cell">暂无自定义请求头，点击下方「+ 添加请求头」新增</td>
              </tr>
            {:else}
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
                    <input type="text" class="kv-val" bind:value={h.description} placeholder="可选说明" />
                  </td>
                  <td style="text-align: center;">
                    <button type="button" class="kv-del" onclick={() => removeHeaderRow(idx)} title="删除行">×</button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
        <button type="button" class="kv-add-inline" style="margin-top: 8px;" onclick={addHeaderRow}>
          + 添加请求头
        </button>
      </div>
    {/if}

    <!-- SubTab: Body -->
    {#if currentSubTab === 'body'}
      <div
        class="subtab-content"
        class:body-flex={$activeRequest.body.mode === 'raw-json' || $activeRequest.body.mode === 'raw-text'}
        role="tabpanel"
        id="req-panel-body"
        aria-labelledby="req-tab-body"
        tabindex="0"
      >
        <div class="body-toolbar" style="margin-bottom: {$activeRequest.body.mode === 'raw-json' || $activeRequest.body.mode === 'raw-text' ? '0' : '10px'};">
          <div class="segmented-group" role="radiogroup" aria-label="请求体格式">
            <button
              type="button"
              class="seg-btn"
              class:active={$activeRequest.body.mode === 'none'}
              onclick={() => ($activeRequest!.body.mode = 'none')}
            >
              none
            </button>
            <button
              type="button"
              class="seg-btn"
              class:active={$activeRequest.body.mode === 'raw-json'}
              onclick={() => ($activeRequest!.body.mode = 'raw-json')}
            >
              JSON
            </button>
            <button
              type="button"
              class="seg-btn"
              class:active={$activeRequest.body.mode === 'raw-text'}
              onclick={() => ($activeRequest!.body.mode = 'raw-text')}
            >
              Text
            </button>
            <button
              type="button"
              class="seg-btn"
              class:active={$activeRequest.body.mode === 'urlencoded'}
              onclick={() => ($activeRequest!.body.mode = 'urlencoded')}
            >
              x-www-form-urlencoded
            </button>
          </div>

          {#if $activeRequest.body.mode === 'raw-json'}
            <button
              type="button"
              class="ctrl-btn"
              style="height: 26px; font-size: 11.5px; padding: 0 8px;"
              onclick={formatJsonBody}
            >
              格式化 JSON
            </button>
          {/if}
        </div>

        {#if $activeRequest.body.mode === 'none'}
          <div style="color: var(--text-muted); font-size: 12px; padding: 28px 0; text-align: center;">
            当前请求无请求体 (Body)
          </div>
        {:else if $activeRequest.body.mode === 'raw-json' || $activeRequest.body.mode === 'raw-text'}
          <textarea
            class="code-textarea"
            bind:value={$activeRequest.body.raw}
            placeholder={$activeRequest.body.mode === 'raw-json' ? '{\n  "key": "value"\n}' : '输入文本请求体内容，支持 {{var}} 变量替换'}
            spellcheck="false"
          ></textarea>
        {:else}
          <table class="kv-table">
            <thead>
              <tr>
                <th style="width: 34px; text-align: center;"></th>
                <th style="width: 34%;">字段名 (Key)</th>
                <th style="width: 38%;">字段值 (Value)</th>
                <th>说明</th>
                <th style="width: 34px;"></th>
              </tr>
            </thead>
            <tbody>
              {#each $activeRequest.body.form_data || [] as item, idx}
                <tr class="kv-row">
                  <td style="text-align: center;">
                    <input type="checkbox" bind:checked={item.enabled} />
                  </td>
                  <td>
                    <input type="text" class="kv-key" bind:value={item.key} placeholder="key" />
                  </td>
                  <td>
                    <input type="text" class="kv-val" bind:value={item.value} placeholder="value" />
                  </td>
                  <td>
                    <input type="text" class="kv-val" bind:value={item.description} placeholder="可选说明" />
                  </td>
                  <td style="text-align: center;">
                    <button type="button" class="kv-del" onclick={() => removeFormDataRow(idx)} title="删除行">×</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <button type="button" class="ctrl-btn ghost" style="margin-top: 8px; height: 26px; font-size: 12px;" onclick={addFormDataRow}>
            + 添加表单字段
          </button>
        {/if}
      </div>
    {/if}

    <!-- SubTab: Auth -->
    {#if currentSubTab === 'auth'}
      <div
        class="subtab-content"
        role="tabpanel"
        id="req-panel-auth"
        aria-labelledby="req-tab-auth"
        tabindex="0"
        style="max-width: 480px;"
      >
        <div style="margin-bottom: 12px;">
          <span style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">认证方式</span>
          <CustomSelect
            bind:value={$activeRequest.auth.auth_type}
            options={authTypeOptions}
            ariaLabel="认证方式"
            minWidth="220px"
          />
        </div>

        {#if $activeRequest.auth.auth_type === 'bearer'}
          <div>
            <label for="bearerTokenInput" style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Token</label>
            <input
              id="bearerTokenInput"
              type="password"
              class="ctrl-input mono"
              style="width: 100%;"
              bind:value={$activeRequest.auth.token}
              placeholder={"eyJhbGciOi... 或 {{token}}"}
            />
          </div>
        {:else if $activeRequest.auth.auth_type === 'basic'}
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label for="basicUsernameInput" style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Username</label>
              <input id="basicUsernameInput" type="text" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.username} />
            </div>
            <div style="flex: 1;">
              <label for="basicPasswordInput" style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Password</label>
              <input id="basicPasswordInput" type="password" class="ctrl-input" style="width: 100%;" bind:value={$activeRequest.auth.password} />
            </div>
          </div>
        {:else if $activeRequest.auth.auth_type === 'api-key'}
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label for="apiKeyNameInput" style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Key</label>
              <input id="apiKeyNameInput" type="text" class="ctrl-input mono" style="width: 100%;" bind:value={$activeRequest.auth.key} placeholder="X-Api-Key" />
            </div>
            <div style="flex: 1;">
              <label for="apiKeyValueInput" style="display: block; font-size: 12px; margin-bottom: 5px; color: var(--text-secondary);">Value</label>
              <input id="apiKeyValueInput" type="password" class="ctrl-input mono" style="width: 100%;" bind:value={$activeRequest.auth.value} />
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </section>
{/if}
