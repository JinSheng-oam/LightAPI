<script lang="ts">
  import { onMount } from 'svelte';
  import {
    projects,
    showNewProjectModal,
    showImportModal,
    loadInitialData,
    loadSampleDemoProject,
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

  <div style="display: flex; flex: 1; overflow: hidden;">
    <ProjectTree />

    {#if $projects.length === 0}
      <!-- First-Launch Empty State (AC-01) with Workbench Shell -->
      <main class="empty-launch">
        <div class="empty-box">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span class="brand-tag">AC-01 首次启动 · 本地优先 · 无需登录</span>
            <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">
              SQLite WAL · 0 Cloud Telemetry
            </span>
          </div>
          <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">
            欢迎使用 LightAPI 本地接口调试客户端
          </h1>
          <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.6; margin-bottom: 8px;">
            轻量、极速、离线优先的现代化 API 调试客户端。直接导入 Apifox / OpenAPI 数据，基于 Rust <code>reqwest</code> 原生驱动，零跨域阻碍。所有环境变量、敏感凭据与历史记录均安全保存在本机。
          </p>

          <div class="empty-grid" style="grid-template-columns: repeat(3, 1fr);">
            <button type="button" class="action-tile" onclick={() => showImportModal.set(true)}>
              <div style="font-size: 20px;">📂</div>
              <span style="font-weight: 600; font-size: 13px; color: var(--accent-primary);">
                导入 Apifox / OpenAPI
              </span>
              <span style="color: var(--text-secondary); font-size: 11px; line-height: 1.4;">
                支持 OpenAPI 3.0/3.1 (JSON/YAML) 与 Swagger 2.0，两阶段解析预览与安全导入。
              </span>
            </button>

            <button type="button" class="action-tile" onclick={() => showNewProjectModal.set(true)}>
              <div style="font-size: 20px;">⚡</div>
              <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">
                新建空白项目
              </span>
              <span style="color: var(--text-secondary); font-size: 11px; line-height: 1.4;">
                创建本地项目工程，配置多套环境变量与前置 URL，即刻发起真实调用。
              </span>
            </button>

            <button type="button" class="action-tile" onclick={loadSampleDemoProject}>
              <div style="font-size: 20px;">🚀</div>
              <span style="font-weight: 600; font-size: 13px; color: var(--method-get);">
                加载示例项目
              </span>
              <span style="color: var(--text-secondary); font-size: 11px; line-height: 1.4;">
                快速载入「核心交易与支付网关」示例工程，体验变量替换与真实请求。
              </span>
            </button>
          </div>
        </div>
      </main>
    {:else}
      <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <RequestEditor />
        <ResponseViewer />
      </main>
    {/if}
  </div>

  <!-- Modals -->
  <ImportWizardModal />
  <EnvironmentModal />
  <NewProjectModal />
</div>
