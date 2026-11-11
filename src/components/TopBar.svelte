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

  function onProjectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    const found = $projects.find((p) => p.id === selectedId);
    if (found) {
      currentProject.set(found);
      loadProjectDetails(found.id);
    }
  }

  function onEnvChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
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
    <div class="brand">
      <span class="brand-mark">LA</span>
      <span class="brand-title">LightAPI</span>
      <span class="brand-tag">Tauri 2 · Rust reqwest · SQLite</span>
    </div>

    <label for="projectSelect" style="color: var(--text-secondary); font-size: 12px;">项目</label>
    <select
      id="projectSelect"
      class="ctrl-select"
      value={$currentProject?.id || ''}
      onchange={onProjectChange}
    >
      {#if $projects.length === 0}
        <option value="">暂无项目 (请新建)</option>
      {:else}
        {#each $projects as p}
          <option value={p.id}>{p.name}</option>
        {/each}
      {/if}
    </select>
    <button
      class="ctrl-btn"
      onclick={() => showNewProjectModal.set(true)}
      title="新建本地项目"
    >
      + 新建项目
    </button>
  </div>

  <div class="topbar-center">
    <div class="env-selector-wrap">
      <span class="env-badge-dot" style:background={$currentEnvironment?.is_production ? 'var(--status-err)' : 'var(--status-ok)'}></span>
      <select
        id="envSelect"
        class="ctrl-select"
        value={$currentEnvironment?.id || ''}
        onchange={onEnvChange}
      >
        {#if $environments.length === 0}
          <option value="">无环境</option>
        {:else}
          {#each $environments as env}
            <option value={env.id}>{env.name}</option>
          {/each}
        {/if}
      </select>
      {#if $currentEnvironment?.is_production}
        <span class="prod-pill">PROD 生产保护开启</span>
      {/if}
    </div>

    <button
      class="ctrl-btn"
      disabled={!$currentProject}
      onclick={() => showEnvModal.set(true)}
      title="配置当前项目的环境变量"
    >
      环境变量 ({`{{var}}`})
    </button>

    <button
      class="ctrl-btn primary"
      onclick={() => showImportModal.set(true)}
      title="导入 Apifox / OpenAPI / Swagger"
    >
      导入 Apifox / OpenAPI
    </button>
  </div>

  <div class="topbar-right">
    <button class="ctrl-btn ghost" onclick={toggleTheme} title="切换主题">
      {$theme === 'dark' ? '☀️ 浅色' : '🌙 深色'}
    </button>
  </div>
</header>
