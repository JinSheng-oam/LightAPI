<script lang="ts">
  import {
    currentProject,
    folders,
    requests,
    activeRequest,
  } from '../stores/appStore';
  import { api } from '../lib/api';
  import type { CanonicalRequest, HttpMethod } from '../lib/types';

  let searchQuery = $state('');

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
    switch (m) {
      case 'GET':
        return 'method-tag method-get';
      case 'POST':
        return 'method-tag method-post';
      case 'PUT':
        return 'method-tag method-put';
      case 'DELETE':
        return 'method-tag method-delete';
      case 'PATCH':
        return 'method-tag method-patch';
      default:
        return 'method-tag';
    }
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
    <span style="font-weight: 600; font-size: 13px;">接口目录 ({filteredRequests.length})</span>
    <button
      class="ctrl-btn"
      style="padding: 2px 8px; font-size: 11px;"
      onclick={createNewRequest}
      disabled={!$currentProject}
      title="新建空白请求"
    >
      + 接口
    </button>
  </div>

  <div class="sidebar-search">
    <input
      type="text"
      placeholder="搜索接口名称、路径、方法..."
      bind:value={searchQuery}
    />
  </div>

  <div class="tree-container" style="flex: 1; overflow-y: auto; padding: 4px;">
    {#if !$currentProject}
      <div style="padding: 16px; color: var(--text-muted); font-size: 12px; text-align: center;">
        暂未选择项目
      </div>
    {:else if filteredRequests.length === 0}
      <div style="padding: 16px; color: var(--text-muted); font-size: 12px; text-align: center;">
        无匹配接口
      </div>
    {:else}
      <!-- Folders with requests -->
      {#each $folders as folder}
        {@const folderReqs = filteredRequests.filter((r) => r.folder_id === folder.id)}
        {#if folderReqs.length > 0}
          <div class="tree-node">
            <div class="folder-header">
              <span>📁 {folder.name}</span>
              <span style="color: var(--text-muted); font-size: 11px;">({folderReqs.length})</span>
            </div>
            <div style="padding-left: 14px;">
              {#each folderReqs as req}
                <div class="api-leaf" class:active={$activeRequest?.id === req.id}>
                  <div
                    role="button"
                    tabindex="0"
                    style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; cursor: pointer;"
                    onclick={() => activeRequest.set(req)}
                    onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && activeRequest.set(req)}
                  >
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
          </div>
        {/if}
      {/each}

      <!-- Root level requests (without folder) -->
      {@const rootReqs = filteredRequests.filter((r) => !r.folder_id)}
      {#if rootReqs.length > 0}
        <div style="margin-top: 4px;">
          {#each rootReqs as req}
            <div class="api-leaf" class:active={$activeRequest?.id === req.id}>
              <div
                role="button"
                tabindex="0"
                style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; cursor: pointer;"
                onclick={() => activeRequest.set(req)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && activeRequest.set(req)}
              >
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
