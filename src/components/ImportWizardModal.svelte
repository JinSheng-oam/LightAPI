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
      errorMsg = '请输入或粘贴文件内容';
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
      alert(`导入成功！共导入 ${report.imported} 条接口。`);
      showImportModal.set(false);
      // Reload projects
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
      style="max-width: 680px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <span class="modal-title">导入 Apifox / OpenAPI / Swagger 数据（两阶段安全预览）</span>
        <button type="button" class="leaf-action-btn" onclick={() => showImportModal.set(false)} title="关闭">×</button>
      </div>

      <div class="modal-body">
        <!-- File Dropzone -->
        <label class="file-upload-zone">
          <div class="file-upload-icon">📂</div>
          <div class="file-upload-title">
            {fileName && rawContent ? `已选择文件: ${fileName}` : '点击选择本地 .json / .yaml / .yml 文件'}
          </div>
          <div class="file-upload-hint">
            支持 OpenAPI 3.0/3.1、Swagger 2.0 及 Apifox 导出文件，系统自动解析顶层特征
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
            或直接粘贴规范文本内容：
          </label>
          <textarea
            id="importContentArea"
            class="code-textarea"
            rows="5"
            bind:value={rawContent}
            placeholder="在此直接粘贴 OpenAPI 3.0 / 3.1 或 Swagger 2.0 的 JSON / YAML 文本..."
          ></textarea>
        </div>

        {#if errorMsg}
          <div class="alert-error">
            ❌ {errorMsg}
          </div>
        {/if}

        {#if preview}
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 13px; font-weight: 600;">解析与合规性预览</span>
              <span class="brand-tag">识别格式: {preview.detected_format}</span>
            </div>

            <div class="preview-metrics">
              <div class="metric-box">
                <div class="metric-label">项目名称</div>
                <div class="metric-val" style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title={preview.project_name}>
                  {preview.project_name}
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">解析接口数</div>
                <div class="metric-val" style="color: var(--accent-primary);">{preview.request_count}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">分组目录数</div>
                <div class="metric-val">{preview.folder_count}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">潜在风险告警</div>
                <div class="metric-val" style:color={preview.warnings.length > 0 ? 'var(--status-warn)' : 'var(--status-ok)'}>
                  {preview.warnings.length}
                </div>
              </div>
            </div>

            {#if preview.warnings.length > 0}
              <div class="warn-list" style="margin-top: 12px;">
                {#each preview.warnings as w}
                  <div class="warn-item">
                    ⚠️ [{w.code}] {w.message}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <span style="font-size: 11px; color: var(--text-muted);">
          本地导入完全离线运行，不会向任何外部云端发送接口数据
        </span>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="ctrl-btn ghost" onclick={() => showImportModal.set(false)}>
            取消
          </button>
          {#if !preview}
            <button type="button" class="ctrl-btn primary" disabled={isAnalyzing} onclick={analyzeContent}>
              {isAnalyzing ? '分析中...' : '解析预览'}
            </button>
          {:else}
            <button type="button" class="ctrl-btn" onclick={() => (preview = null)}>
              重新选择
            </button>
            <button type="button" class="ctrl-btn primary" disabled={isCommitting} onclick={commitImport}>
              {isCommitting ? '导入写入中...' : '确认导入并写入项目'}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
