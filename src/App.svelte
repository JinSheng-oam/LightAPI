<script lang="ts">
  import { onMount } from 'svelte';
  import {
    projects,
    activeRequest,
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

  let responseHeightPct = $state(44);
  let isDragging = $state(false);
  let workspaceEl: HTMLElement | undefined = $state();

  onMount(() => {
    loadInitialData();
  });

  function startResize(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    const onMove = (ev: MouseEvent) => {
      if (!workspaceEl) return;
      const rect = workspaceEl.getBoundingClientRect();
      const offsetBottom = rect.bottom - ev.clientY;
      const pct = (offsetBottom / rect.height) * 100;
      responseHeightPct = Math.min(75, Math.max(20, pct));
    };
    const onUp = () => {
      isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
</script>

<div class="app-shell">
  <TopBar />

  <div class="workspace-body">
    <ProjectTree />

    {#if $projects.length === 0}
      <main class="empty-launch">
        <div class="empty-box">
          <h1 style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">
            开始使用 LightAPI
          </h1>
          <p style="color: var(--text-secondary); font-size: 12.5px; line-height: 1.55;">
            导入现有接口规范或创建本地项目以开始调试。
          </p>

          <div class="empty-grid">
            <button type="button" class="action-tile" onclick={() => showImportModal.set(true)}>
              <div class="tile-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <span style="font-weight: 600; font-size: 13px;">导入接口规范</span>
              <span style="color: var(--text-secondary); font-size: 11.5px; line-height: 1.4;">
                支持 Apifox、OpenAPI 3.x 与 Swagger 2.0
              </span>
            </button>

            <button type="button" class="action-tile" onclick={() => showNewProjectModal.set(true)}>
              <div class="tile-icon" style="color: var(--text-primary);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style="font-weight: 600; font-size: 13px;">新建空白项目</span>
              <span style="color: var(--text-secondary); font-size: 11.5px; line-height: 1.4;">
                创建独立项目并配置环境变量与前置地址
              </span>
            </button>

            <button type="button" class="action-tile" onclick={loadSampleDemoProject}>
              <div class="tile-icon" style="color: var(--method-get);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <span style="font-weight: 600; font-size: 13px;">加载示例项目</span>
              <span style="color: var(--text-secondary); font-size: 11.5px; line-height: 1.4;">
                载入示例接口与变量配置，快速体验请求调用
              </span>
            </button>
          </div>
        </div>
      </main>
    {:else}
      <main class="main-workspace" bind:this={workspaceEl}>
        {#if $activeRequest}
          {#key $activeRequest.id}
            <RequestEditor />
          {/key}
        {:else}
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px;">
            从左侧目录选择或新建一个接口进行调试
          </div>
        {/if}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="pane-splitter"
          class:dragging={isDragging}
          role="separator"
          aria-orientation="horizontal"
          onmousedown={startResize}
        ></div>
        <div style="height: {responseHeightPct}%; display: flex; flex-direction: column; min-height: 140px; flex-shrink: 0;">
          <ResponseViewer />
        </div>
      </main>
    {/if}
  </div>

  <ImportWizardModal />
  <EnvironmentModal />
  <NewProjectModal />
</div>
