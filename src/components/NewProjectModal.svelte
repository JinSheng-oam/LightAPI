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
      class="modal-card"
      style="max-width: 420px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h2 style="font-size: 16px; font-weight: 600;">新建本地项目</h2>
        <button type="button" class="leaf-action-btn" onclick={() => showNewProjectModal.set(false)}>×</button>
      </div>

      <div style="margin-bottom: 14px;">
        <label for="newProjectNameInput" style="display: block; font-size: 12px; margin-bottom: 6px; color: var(--text-secondary);">
          项目名称：
        </label>
        <input
          id="newProjectNameInput"
          type="text"
          class="ctrl-input"
          style="width: 100%; font-size: 14px;"
          placeholder="例如：电商系统 API"
          bind:value={projectName}
          onkeydown={(e) => e.key === 'Enter' && createProject()}
        />
      </div>

      {#if errorMsg}
        <div class="alert-error" style="margin-bottom: 12px;">
          ❌ {errorMsg}
        </div>
      {/if}

      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="ctrl-btn ghost" onclick={() => showNewProjectModal.set(false)}>取消</button>
        <button type="button" class="ctrl-btn primary" disabled={isCreating} onclick={createProject}>
          {isCreating ? '创建中...' : '立即创建'}
        </button>
      </div>
    </div>
  </div>
{/if}
