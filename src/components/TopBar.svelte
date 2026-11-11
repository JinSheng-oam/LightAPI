<script lang="ts">
  import {
    projects,
    currentProject,
    environments,
    currentEnvironment,
    theme,
    showImportModal,
    showEnvModal,
    showNewProjectModal,
    loadProjectDetails,
  } from '../stores/appStore';
  import CustomSelect, { type SelectOption } from './CustomSelect.svelte';

  let projectOptions = $derived<SelectOption[]>(
    $projects.map((p) => ({ value: p.id, label: p.name }))
  );

  let envOptions = $derived<SelectOption[]>(
    $environments.map((e) => ({
      value: e.id,
      label: e.name,
      dotColor: e.is_production ? 'var(--status-danger)' : 'var(--status-ok)',
    }))
  );

  function handleProjectSelect(selectedId: string) {
    const found = $projects.find((p) => p.id === selectedId);
    if (found) {
      currentProject.set(found);
      loadProjectDetails(found.id);
    }
  }

  function handleEnvSelect(selectedId: string) {
    const found = $environments.find((e) => e.id === selectedId);
    if (found) {
      currentEnvironment.set(found);
    }
  }

  function toggleTheme() {
    const next = $theme === 'dark' ? 'light' : 'dark';
    theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
  }
</script>

<header class="topbar">
  <div class="topbar-left">
    <CustomSelect
      value={$currentProject?.id || ''}
      options={projectOptions}
      placeholder="暂无项目"
      ariaLabel="当前项目"
      minWidth="180px"
      onchange={handleProjectSelect}
    />

    <button
      type="button"
      class="ctrl-btn"
      onclick={() => showNewProjectModal.set(true)}
      title="新建本地项目"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      新建项目
    </button>
  </div>

  <div class="topbar-right">
    <div class="env-selector-wrap">
      <CustomSelect
        value={$currentEnvironment?.id || ''}
        options={envOptions}
        placeholder="无环境"
        ariaLabel="当前环境"
        minWidth="140px"
        onchange={handleEnvSelect}
      />
      {#if $currentEnvironment?.is_production}
        <span class="prod-pill">PROD</span>
      {/if}
    </div>

    <button
      type="button"
      class="ctrl-btn"
      disabled={!$currentProject}
      onclick={() => showEnvModal.set(true)}
      title="管理环境变量与前置 URL"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      环境变量
    </button>

    <button
      type="button"
      class="ctrl-btn primary"
      onclick={() => showImportModal.set(true)}
      title="导入 Apifox / OpenAPI / Swagger"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      导入
    </button>

    <div class="topbar-divider"></div>

    <button
      type="button"
      class="ctrl-btn ghost"
      style="padding: 0 8px;"
      onclick={toggleTheme}
      title={$theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
      aria-label="切换主题"
    >
      {#if $theme === 'dark'}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      {:else}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      {/if}
    </button>
  </div>
</header>
