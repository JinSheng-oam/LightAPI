<script lang="ts">
  import { activeResponse, isExecuting, executionError } from '../stores/appStore';

  let respSubTab: 'pretty' | 'raw' | 'headers' = $state('pretty');
  let copyFeedback = $state('');

  let prettyJson = $derived.by(() => {
    if (!$activeResponse?.body_preview) return '';
    try {
      const obj = JSON.parse($activeResponse.body_preview);
      return JSON.stringify(obj, null, 2);
    } catch {
      return $activeResponse.body_preview;
    }
  });

  function getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'resp-status-pill status-2xx';
    if (status >= 300 && status < 400) return 'resp-status-pill status-3xx';
    if (status >= 400 && status < 500) return 'resp-status-pill status-4xx';
    return 'resp-status-pill status-5xx';
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function copyResponseToClipboard() {
    if (!$activeResponse?.body_preview) return;
    try {
      await navigator.clipboard.writeText($activeResponse.body_preview);
      copyFeedback = '已复制';
      setTimeout(() => (copyFeedback = ''), 2000);
    } catch {
      alert('复制失败');
    }
  }
</script>

<div class="response-panel" style="flex: 1; height: 100%;">
  {#if $isExecuting}
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--accent-primary); font-size: 12.5px;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>正在请求...</span>
    </div>
  {:else if $executionError}
    <div style="padding: 14px 16px;">
      <div class="alert-error">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">请求执行失败</div>
        <div class="mono" style="font-size: 12px;">{$executionError}</div>
      </div>
    </div>
  {:else if $activeResponse}
    <div class="resp-header">
      <div style="display: flex; align-items: center; gap: 14px;">
        <span class={getStatusClass($activeResponse.status)}>
          {$activeResponse.status} {$activeResponse.status_text}
        </span>
        <span class="resp-metric">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {$activeResponse.duration_ms} ms
        </span>
        <span class="resp-metric">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {formatBytes($activeResponse.size_bytes)}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; height: 100%;">
        <div class="tab-nav" role="tablist" aria-label="响应展示视图" style="border: none; padding: 0; height: 100%; background: transparent;">
          <button
            type="button"
            role="tab"
            id="resp-tab-pretty"
            aria-controls="resp-panel-content"
            aria-selected={respSubTab === 'pretty'}
            tabindex={respSubTab === 'pretty' ? 0 : -1}
            class="tab-btn"
            style="height: 100%;"
            class:active={respSubTab === 'pretty'}
            onclick={() => (respSubTab = 'pretty')}
          >
            Pretty
          </button>
          <button
            type="button"
            role="tab"
            id="resp-tab-raw"
            aria-controls="resp-panel-content"
            aria-selected={respSubTab === 'raw'}
            tabindex={respSubTab === 'raw' ? 0 : -1}
            class="tab-btn"
            style="height: 100%;"
            class:active={respSubTab === 'raw'}
            onclick={() => (respSubTab = 'raw')}
          >
            Raw
          </button>
          <button
            type="button"
            role="tab"
            id="resp-tab-headers"
            aria-controls="resp-panel-content"
            aria-selected={respSubTab === 'headers'}
            tabindex={respSubTab === 'headers' ? 0 : -1}
            class="tab-btn"
            style="height: 100%;"
            class:active={respSubTab === 'headers'}
            onclick={() => (respSubTab = 'headers')}
          >
            Headers
            <span class="tab-badge">{$activeResponse.headers.length}</span>
          </button>
        </div>

        <button
          type="button"
          class="ctrl-btn"
          style="height: 26px; padding: 0 8px; font-size: 11.5px;"
          onclick={copyResponseToClipboard}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {copyFeedback || '复制'}
        </button>
      </div>
    </div>

    <div
      class="resp-body-wrap"
      role="tabpanel"
      id="resp-panel-content"
      aria-labelledby="resp-tab-{respSubTab}"
      tabindex="0"
    >
      {#if $activeResponse.body_truncated}
        <div class="alert-warn" style="margin-bottom: 8px; font-size: 11.5px;">
          响应体超过 1MB，已截断预览以保证界面流畅
        </div>
      {/if}

      {#if respSubTab === 'pretty'}
        <pre class="resp-code"><code>{prettyJson}</code></pre>
      {:else if respSubTab === 'raw'}
        <pre class="resp-code"><code>{$activeResponse.body_preview}</code></pre>
      {:else if respSubTab === 'headers'}
        <table class="kv-table" style="font-size: 12px; background: var(--bg-surface);">
          <thead>
            <tr>
              <th style="width: 220px;">Header Name</th>
              <th>Header Value</th>
            </tr>
          </thead>
          <tbody>
            {#each $activeResponse.headers as [k, v]}
              <tr class="kv-row">
                <td class="mono" style="color: var(--text-secondary); padding: 6px 10px;">{k}</td>
                <td class="mono" style="word-break: break-all; padding: 6px 10px;">{v}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else}
    <div class="resp-header">
      <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">响应结果</span>
    </div>
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12.5px;">
      发送请求后在此查看响应内容
    </div>
  {/if}
</div>
