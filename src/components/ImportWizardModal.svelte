<script lang="ts">
  import { showImportModal, projects, currentProject, loadProjectDetails } from '../stores/appStore';
  import { api } from '../lib/api';
  import type { ImportPreview } from '../lib/types';

  let rawContent = $state('');
  let fileName = $state('imported_api.json');
  let preview = $state<ImportPreview | null>(null);
  let isAnalyzing = $state(false);
  let isCommitting = $state(false);
  let errorMsg = $state<string | null>(null);

  async function analyzeContent() {
    if (!rawContent.trim()) {
      errorMsg = '请选择文件或粘贴规范文本内容';
      return;
    }
    isAnalyzing = true;
    errorMsg = null;
    try {
      const result = await api.previewImport(rawContent, fileName);
      preview = result;
    } catch (err: any) {
      errorMsg = err?.message || String(err);
      preview = null;
    } finally {
      isAnalyzing = false;
    }
  }

  async function commitImport() {
    if (!rawContent.trim()) return;
    isCommitting = true;
    errorMsg = null;
    try {
      const report = await api.commitImport(rawContent, fileName);
      alert(`导入成功，共导入 ${report.imported} 条接口。`);
      showImportModal.set(false);
      const list = await api.listProjects();
      projects.set(list);
      if (list.length > 0) {
        currentProject.set(list[0]);
        await loadProjectDetails(list[0].id);
      }
    } catch (err: any) {
      errorMsg = err?.message || String(err);
    } finally {
      isCommitting = false;
    }
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      fileName = file.name;
      const reader = new FileReader();
      reader.onload = (evt) => {
        rawContent = (evt.target?.result as string) || '';
        analyzeContent();
      };
      reader.readAsText(file);
    }
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showImportModal.set(false);
    }
  }
</script>

<svelte:window onkeydown={handleBackdropKeydown} />

{#if $showImportModal}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={() => showImportModal.set(false)}
  >
    <div
      class="modal-dialog"
      style="max-width: 640px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <span class="modal-title">导入接口数据</span>
        <button type="button" class="leaf-action-btn" onclick={() => showImportModal.set(false)} title="关闭">×</button>
      </div>

      <div class="modal-body">
        <label class="file-upload-zone">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div class="file-upload-title">
            {fileName && rawContent ? `已选择: ${fileName}` : '选择本地 .json / .yaml / .yml 文件'}
          </div>
          <div class="file-upload-hint">
            支持 Apifox、OpenAPI 3.0/3.1、Swagger 2.0
          </div>
          <input
            id="importFileInput"
            type="file"
            accept=".json,.yaml,.yml"
            style="display: none;"
            onchange={handleFileUpload}
          />
        </label>

        <div>
          <label for="importContentArea" style="display: block; font-size: 12px; margin-bottom: 6px; color: var(--text-secondary);">
            或粘贴 JSON / YAML 文本内容
          </label>
          <textarea
            id="importContentArea"
            class="code-textarea"
            rows="5"
            style="resize: vertical;"
            bind:value={rawContent}
            placeholder="粘贴 OpenAPI / Swagger / Apifox 文本..."
          ></textarea>
        </div>

        {#if errorMsg}
          <div class="alert-error">
            {errorMsg}
          </div>
        {/if}

        {#if preview}
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-size: 12.5px; font-weight: 600;">解析预览</span>
              <span class="brand-tag">{preview.detected_format}</span>
            </div>

            <div class="preview-metrics">
              <div class="metric-box">
                <div class="metric-label">项目名称</div>
                <div class="metric-val" style="font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title={preview.project_name}>
                  {preview.project_name}
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">接口数</div>
                <div class="metric-val" style="color: var(--accent-primary);">{preview.request_count}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">目录数</div>
                <div class="metric-val">{preview.folder_count}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">告警</div>
                <div class="metric-val" style:color={preview.warnings.length > 0 ? 'var(--status-warn)' : 'var(--status-ok)'}>
                  {preview.warnings.length}
                </div>
              </div>
            </div>

            {#if preview.warnings.length > 0}
              <div class="warn-list" style="margin-top: 10px;">
                {#each preview.warnings as w}
                  <div class="warn-item">
                    [{w.code}] {w.message}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="modal-footer" style="justify-content: flex-end; gap: 8px;">
        <button type="button" class="ctrl-btn ghost" onclick={() => showImportModal.set(false)}>
          取消
        </button>
        {#if !preview}
          <button type="button" class="ctrl-btn primary" disabled={isAnalyzing} onclick={analyzeContent}>
            {isAnalyzing ? '解析中...' : '解析预览'}
          </button>
        {:else}
          <button type="button" class="ctrl-btn" onclick={() => (preview = null)}>
            重新选择
          </button>
          <button type="button" class="ctrl-btn primary" disabled={isCommitting} onclick={commitImport}>
            {isCommitting ? '导入中...' : '确认导入'}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
