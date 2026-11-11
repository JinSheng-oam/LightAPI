<script lang="ts">
  import { showNewProjectModal, projects, currentProject, loadProjectDetails } from '../stores/appStore';
  import { api } from '../lib/api';

  let projectName = $state('');
  let isCreating = $state(false);
  let errorMsg = $state<string | null>(null);

  async function createProject() {
    const trimmed = projectName.trim();
    if (!trimmed) {
      errorMsg = '请输入项目名称';
      return;
    }
    isCreating = true;
    errorMsg = null;
    try {
      const created = await api.createProject(trimmed);
      projects.update((list) => [created, ...list]);
      currentProject.set(created);
      await loadProjectDetails(created.id);
      showNewProjectModal.set(false);
      projectName = '';
    } catch (err: any) {
      errorMsg = err?.message || String(err);
    } finally {
      isCreating = false;
    }
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showNewProjectModal.set(false);
    }
  }
</script>

<svelte:window onkeydown={handleBackdropKeydown} />

{#if $showNewProjectModal}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={() => showNewProjectModal.set(false)}
  >
    <div
      class="modal-dialog"
      style="max-width: 440px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <span class="modal-title">新建本地项目</span>
        <button type="button" class="leaf-action-btn" onclick={() => showNewProjectModal.set(false)} title="关闭">×</button>
      </div>

      <div class="modal-body">
        <div>
          <label for="newProjectNameInput" style="display: block; font-size: 12px; margin-bottom: 6px; color: var(--text-secondary);">
            项目名称
          </label>
          <input
            id="newProjectNameInput"
            type="text"
            class="ctrl-input"
            style="width: 100%; font-size: 13px;"
            placeholder="例如：核心交易与支付网关"
            bind:value={projectName}
            onkeydown={(e) => e.key === 'Enter' && createProject()}
          />
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
            项目将保存在本地 SQLite 数据库中，拥有完全独立的环境变量与接口集合。
          </div>
        </div>

        {#if errorMsg}
          <div class="alert-error">
            ❌ {errorMsg}
          </div>
        {/if}
      </div>

      <div class="modal-footer" style="justify-content: flex-end; gap: 8px;">
        <button type="button" class="ctrl-btn ghost" onclick={() => showNewProjectModal.set(false)}>取消</button>
        <button type="button" class="ctrl-btn primary" disabled={isCreating} onclick={createProject}>
          {isCreating ? '创建中...' : '立即创建'}
        </button>
      </div>
    </div>
  </div>
{/if}
