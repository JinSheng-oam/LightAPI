<script lang="ts">
  import { onMount } from 'svelte';
  import {
    projects,
    showNewProjectModal,
    showImportModal,
    loadInitialData,
  } from './stores/appStore';
  import TopBar from './components/TopBar.svelte';
  import ProjectTree from './components/ProjectTree.svelte';
  import RequestEditor from './components/RequestEditor.svelte';
  import ResponseViewer from './components/ResponseViewer.svelte';
  import ImportWizardModal from './components/ImportWizardModal.svelte';
  import EnvironmentModal from './components/EnvironmentModal.svelte';
  import NewProjectModal from './components/NewProjectModal.svelte';

  onMount(() => {
    loadInitialData();
  });
</script>

<div class="app-shell">
  <TopBar />

  {#if $projects.length === 0}
    <!-- First-Launch Empty State (AC-01) -->
    <main class="empty-launch">
      <div class="empty-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span class="brand-tag">AC-01 首次启动 · 本地优先 · 无需登录</span>
          <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">
            SQLite WAL · 0 Cloud Telemetry
          </span>
        </div>
        <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">
          欢迎使用 LightAPI 本地接口调试客户端
        </h1>
        <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
          直接导入 Apifox 导出的 OpenAPI / Swagger 或原生数据，通过 Rust <code>reqwest</code> 引擎发起零跨域限制的真实 HTTP 请求。所有环境变量、敏感凭据与历史记录均安全保存在本机。
        </p>
        <div style="display: flex; gap: 14px; justify-content: center;">
          <button
            class="ctrl-btn primary"
            style="padding: 10px 20px; font-size: 14px;"
            onclick={() => showImportModal.set(true)}
          >
            导入 Apifox / OpenAPI 文件
          </button>
          <button
            class="ctrl-btn"
            style="padding: 10px 20px; font-size: 14px;"
            onclick={() => showNewProjectModal.set(true)}
          >
            新建空白项目
          </button>
        </div>
      </div>
    </main>
  {:else}
    <div style="display: flex; flex: 1; overflow: hidden;">
      <ProjectTree />
      <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <RequestEditor />
        <ResponseViewer />
      </main>
    </div>
  {/if}

  <!-- Modals -->
  <ImportWizardModal />
  <EnvironmentModal />
  <NewProjectModal />
</div>
