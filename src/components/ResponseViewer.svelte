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
      copyFeedback = '已复制!';
      setTimeout(() => (copyFeedback = ''), 2000);
    } catch (e) {
      alert('复制失败');
    }
  }
</script>

<div class="response-panel">
  {#if $isExecuting}
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--accent-primary); font-size: 13px;">
      ⏳ 正在通过 Rust reqwest 发起请求...
    </div>
  {:else if $executionError}
    <div class="alert-error" style="margin: 12px;">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">❌ 请求执行失败</div>
      <div style="font-size: 12px; font-family: monospace;">{$executionError}</div>
    </div>
  {:else if $activeResponse}
    <!-- Response Header Bar -->
    <div class="resp-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span class={getStatusClass($activeResponse.status)}>
          {$activeResponse.status} {$activeResponse.status_text}
        </span>
        <span class="resp-metric">⏱️ {$activeResponse.duration_ms} ms</span>
        <span class="resp-metric">📦 {formatBytes($activeResponse.size_bytes)}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="tab-nav" role="tablist" aria-label="响应展示视图" style="border: none; margin: 0;">
          <button
            type="button"
            role="tab"
            id="resp-tab-pretty"
            aria-controls="resp-panel-content"
            aria-selected={respSubTab === 'pretty'}
            tabindex={respSubTab === 'pretty' ? 0 : -1}
            class="tab-btn"
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
            class:active={respSubTab === 'headers'}
            onclick={() => (respSubTab = 'headers')}
          >
            Headers ({$activeResponse.headers.length})
          </button>
        </div>

        <button type="button" class="ctrl-btn ghost" style="font-size: 11px;" onclick={copyResponseToClipboard}>
          {copyFeedback || '复制响应'}
        </button>
      </div>
    </div>

    <!-- Response Body Container -->
    <div
      class="resp-body-wrap"
      role="tabpanel"
      id="resp-panel-content"
      aria-labelledby="resp-tab-{respSubTab}"
      tabindex="0"
      style="flex: 1; overflow: auto; padding: 8px;"
    >
      {#if $activeResponse.body_truncated}
        <div class="alert-warn" style="margin-bottom: 6px; font-size: 11px;">
          ⚠️ 响应体过大（大于 1MB），已自动截断预览以保证界面流畅
        </div>
      {/if}

      {#if respSubTab === 'pretty'}
        <pre class="resp-code"><code>{prettyJson}</code></pre>
      {:else if respSubTab === 'raw'}
        <pre class="resp-code"><code>{$activeResponse.body_preview}</code></pre>
      {:else if respSubTab === 'headers'}
        <table class="kv-table" style="font-size: 12px;">
          <thead>
            <tr>
              <th style="width: 200px;">Header Name</th>
              <th>Header Value</th>
            </tr>
          </thead>
          <tbody>
            {#each $activeResponse.headers as [k, v]}
              <tr class="kv-row">
                <td style="color: var(--text-secondary); font-family: monospace;">{k}</td>
                <td style="font-family: monospace; word-break: break-all;">{v}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {:else}
    <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
      点击右上角【发送】按钮发起请求，响应结果将展示在此处
    </div>
  {/if}
</div>
