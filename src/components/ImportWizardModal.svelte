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
      class="modal-card"
      style="max-width: 680px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 600;">导入 Apifox / OpenAPI / Swagger</h2>
        <button type="button" class="leaf-action-btn" onclick={() => showImportModal.set(false)}>×</button>
      </div>

      <div style="margin-bottom: 14px;">
        <label for="importFileInput" style="display: block; font-size: 12px; margin-bottom: 6px; color: var(--text-secondary);">
          选择本地 .json / .yaml 文件：
        </label>
        <input
          id="importFileInput"
          type="file"
          accept=".json,.yaml,.yml"
          onchange={handleFileUpload}
          style="font-size: 12px;"
        />
      </div>

      <div style="margin-bottom: 14px;">
        <label for="importContentArea" style="display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-secondary);">
          或直接粘贴 JSON / YAML 内容：
        </label>
        <textarea
          id="importContentArea"
          class="code-textarea"
          rows="6"
          bind:value={rawContent}
          placeholder="在此粘贴 OpenAPI 3.0 / 3.1 或 Swagger 2.0 内容..."
        ></textarea>
      </div>

      {#if errorMsg}
        <div class="alert-error" style="margin-bottom: 12px;">
          ❌ {errorMsg}
        </div>
      {/if}

      {#if preview}
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">
            识别格式: <span style="color: var(--accent-primary);">{preview.detected_format}</span>
          </div>
          <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
            <span>项目: <strong>{preview.project_name}</strong></span>
            <span>接口数: <strong>{preview.request_count}</strong></span>
            <span>分组数: <strong>{preview.folder_count}</strong></span>
          </div>

          {#if preview.warnings.length > 0}
            <div class="text-warn" style="margin-top: 8px; font-size: 11px;">
              {#each preview.warnings as w}
                <div>⚠️ [{w.code}] {w.message}</div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        {#if !preview}
          <button type="button" class="ctrl-btn" disabled={isAnalyzing} onclick={analyzeContent}>
            {isAnalyzing ? '分析中...' : '解析预览'}
          </button>
        {:else}
          <button type="button" class="ctrl-btn ghost" onclick={() => (preview = null)}>
            重新选择
          </button>
          <button type="button" class="ctrl-btn primary" disabled={isCommitting} onclick={commitImport}>
            {isCommitting ? '导入写入中...' : '确认导入并写入项目'}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
