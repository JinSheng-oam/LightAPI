<script lang="ts">
  import {
    currentProject,
    folders,
    requests,
    activeRequest,
    selectRequest,
  } from '../stores/appStore';
  import { api } from '../lib/api';
  import type { CanonicalRequest, HttpMethod } from '../lib/types';

  let searchQuery = $state('');
  let collapsedFolders = $state<Record<string, boolean>>({});

  let filteredRequests = $derived(
    $requests.filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q)
      );
    })
  );

  function getMethodClass(method: HttpMethod): string {
    const m = (typeof method === 'string' ? method : '').toUpperCase();
    return `method-tag method-${m}`;
  }

  function toggleFolder(folderId: string) {
    collapsedFolders[folderId] = !collapsedFolders[folderId];
  }

  async function createNewRequest() {
    if (!$currentProject) return;
    const newReq: CanonicalRequest = {
      id: crypto.randomUUID(),
      project_id: $currentProject.id,
      folder_id: null,
      name: '新接口',
      method: 'GET',
      path: '/api/example',
      params: [],
      headers: [],
      body: { mode: 'none', raw: '', form_data: [] },
      auth: { auth_type: 'none' },
      locally_modified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const saved = await api.saveRequest(newReq);
      requests.update((list) => [saved, ...list]);
      activeRequest.set(saved);
    } catch (e) {
      alert(`创建接口失败: ${e}`);
    }
  }

  async function deleteRequest(event: MouseEvent, req: CanonicalRequest) {
    event.stopPropagation();
    if (!confirm(`确定删除接口 "${req.name}" 吗？`)) return;
    try {
      await api.deleteRequest(req.id);
      requests.update((list) => list.filter((r) => r.id !== req.id));
      if ($activeRequest?.id === req.id) {
        activeRequest.set($requests[0] || null);
      }
    } catch (e) {
      alert(`删除接口失败: ${e}`);
    }
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <div>
      <span>接口目录</span>
      <span class="sidebar-count">{filteredRequests.length}</span>
    </div>
    <button
      type="button"
      class="ctrl-btn"
      style="height: 26px; padding: 0 8px; font-size: 11.5px;"
      onclick={createNewRequest}
      disabled={!$currentProject}
      title="新建接口"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      接口
    </button>
  </div>

  <div class="sidebar-search">
    <div class="search-box">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        type="text"
        placeholder="搜索名称、路径或方法..."
        bind:value={searchQuery}
      />
    </div>
  </div>

  <div class="tree-container">
    {#if !$currentProject}
      <div style="padding: 36px 16px; color: var(--text-muted); font-size: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;">
        <span>暂未选择项目</span>
      </div>
    {:else if filteredRequests.length === 0}
      <div style="padding: 36px 16px; color: var(--text-muted); font-size: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
        <span>{searchQuery.trim() ? '无匹配接口' : '当前项目暂无接口'}</span>
        {#if !searchQuery.trim()}
          <button
            type="button"
            class="ctrl-btn"
            style="height: 26px; font-size: 11.5px;"
            onclick={createNewRequest}
          >
            + 新建接口
          </button>
        {/if}
      </div>
    {:else}
      {#each $folders as folder}
        {@const folderReqs = filteredRequests.filter((r) => r.folder_id === folder.id)}
        {#if folderReqs.length > 0}
          <div class="tree-node">
            <button
              type="button"
              class="folder-header"
              onclick={() => toggleFolder(folder.id)}
            >
              <span class="folder-left">
                <svg
                  class="folder-chevron"
                  class:collapsed={collapsedFolders[folder.id]}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{folder.name}</span>
              </span>
              <span style="color: var(--text-muted); font-size: 11px; font-family: var(--font-mono);">{folderReqs.length}</span>
            </button>
            {#if !collapsedFolders[folder.id]}
              <div class="folder-children">
                {#each folderReqs as req}
                  <div
                    class="api-leaf"
                    class:active={$activeRequest?.id === req.id}
                    role="button"
                    tabindex="0"
                    onclick={() => selectRequest(req)}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectRequest(req)}
                  >
                    <div class="api-leaf-main">
                      <span class={getMethodClass(req.method)}>{req.method}</span>
                      <span class="api-leaf-title" title="{req.name} ({req.path})">{req.name}</span>
                    </div>
                    <button
                      type="button"
                      class="leaf-action-btn"
                      title="删除接口"
                      onclick={(e) => deleteRequest(e, req)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}

      {@const rootReqs = filteredRequests.filter((r) => !r.folder_id)}
      {#if rootReqs.length > 0}
        <div>
          {#each rootReqs as req}
            <div
              class="api-leaf"
              class:active={$activeRequest?.id === req.id}
              role="button"
              tabindex="0"
              onclick={() => selectRequest(req)}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectRequest(req)}
            >
              <div class="api-leaf-main">
                <span class={getMethodClass(req.method)}>{req.method}</span>
                <span class="api-leaf-title" title="{req.name} ({req.path})">{req.name}</span>
              </div>
              <button
                type="button"
                class="leaf-action-btn"
                title="删除接口"
                onclick={(e) => deleteRequest(e, req)}
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</aside>
