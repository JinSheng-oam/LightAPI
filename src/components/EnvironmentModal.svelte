<script lang="ts">
  import {
    showEnvModal,
    currentEnvironment,
    environments,
    currentProject,
  } from '../stores/appStore';
  import { api } from '../lib/api';

  function addVariable() {
    if (!$currentEnvironment) return;
    $currentEnvironment.variables.push({
      key: '',
      value: '',
      is_secret: false,
      enabled: true,
      description: '',
    });
    currentEnvironment.set($currentEnvironment);
  }

  function removeVariable(index: number) {
    if (!$currentEnvironment) return;
    $currentEnvironment.variables.splice(index, 1);
    currentEnvironment.set($currentEnvironment);
  }

  function addBaseUrl() {
    if (!$currentEnvironment) return;
    $currentEnvironment.base_urls.push({
      key: $currentEnvironment.base_urls.length === 0 ? 'default' : `service_${$currentEnvironment.base_urls.length + 1}`,
      url: 'http://localhost:8080',
      description: '',
      enabled: $currentEnvironment.base_urls.length === 0,
    });
    currentEnvironment.set($currentEnvironment);
  }

  function removeBaseUrl(index: number) {
    if (!$currentEnvironment) return;
    $currentEnvironment.base_urls.splice(index, 1);
    currentEnvironment.set($currentEnvironment);
  }

  async function saveEnvironment() {
    if (!$currentEnvironment) return;
    try {
      await api.saveEnvironment($currentEnvironment);
      environments.update((list) =>
        list.map((e) => (e.id === $currentEnvironment!.id ? $currentEnvironment! : e))
      );
      showEnvModal.set(false);
    } catch (e) {
      alert(`保存环境配置失败: ${e}`);
    }
  }

  async function createNewEnvironment() {
    if (!$currentProject) return;
    const nextIdx = $environments.length + 1;
    const newEnv = {
      id: crypto.randomUUID(),
      project_id: $currentProject.id,
      name: nextIdx === 1 ? '开发环境' : `环境 ${nextIdx}`,
      base_urls: [
        {
          key: 'default',
          url: 'http://localhost:8080',
          description: '默认服务地址',
          enabled: true,
        },
      ],
      variables: [],
      is_production: false,
    };

    try {
      await api.saveEnvironment(newEnv);
      environments.update((list) => [...list, newEnv]);
      currentEnvironment.set(newEnv);
    } catch (e) {
      alert(`创建新环境失败: ${e}`);
    }
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showEnvModal.set(false);
    }
  }
</script>

<svelte:window onkeydown={handleBackdropKeydown} />

{#if $showEnvModal}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={() => showEnvModal.set(false)}
  >
    <div
      class="modal-dialog"
      style="max-width: 720px;"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <span class="modal-title">环境与变量配置</span>
        <button type="button" class="leaf-action-btn" onclick={() => showEnvModal.set(false)} title="关闭">×</button>
      </div>

      <!-- Environment Switcher Bar -->
      <div class="env-tabs-bar">
        <div class="env-tabs-list">
          {#each $environments as env}
            <button
              type="button"
              class="env-tab-pill"
              class:active={$currentEnvironment?.id === env.id}
              onclick={() => currentEnvironment.set(env)}
            >
              <span
                class="cselect-dot"
                style="background: {env.is_production ? 'var(--status-danger)' : 'var(--status-ok)'};"
              ></span>
              <span>{env.name || '未命名'}</span>
            </button>
          {/each}
        </div>
        <button type="button" class="ctrl-btn" style="height: 26px; font-size: 11.5px; padding: 0 8px;" onclick={createNewEnvironment}>
          + 新建环境
        </button>
      </div>

      {#if !$currentEnvironment}
        <div class="modal-body" style="padding: 36px 20px; align-items: center; text-align: center; color: var(--text-muted);">
          <span>当前项目暂无环境配置</span>
          <button type="button" class="ctrl-btn primary" style="margin-top: 6px;" onclick={createNewEnvironment}>
            + 创建首个环境
          </button>
        </div>
      {:else}
        <div class="modal-body">
          <!-- Name and Prod Guard Row -->
          <div class="env-meta-row">
            <div style="flex: 1;">
              <label for="envNameInput" class="field-label">环境名称</label>
              <input
                id="envNameInput"
                type="text"
                class="ctrl-input"
                style="width: 100%; height: 32px;"
                placeholder="例如：开发环境"
                bind:value={$currentEnvironment.name}
              />
            </div>

            <label class="prod-toggle-card" class:active={$currentEnvironment.is_production}>
              <input type="checkbox" bind:checked={$currentEnvironment.is_production} />
              <span>生产环境保护 (PROD)</span>
            </label>
          </div>

          <!-- Base URLs Section -->
          <div class="env-section">
            <div class="env-section-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="env-section-title">前置 URL</span>
                <code class="code-chip">{`{{baseUrl}}`}</code>
              </div>
              <button type="button" class="kv-add-inline" onclick={addBaseUrl}>
                + 添加地址
              </button>
            </div>

            <table class="kv-table">
              <thead>
                <tr>
                  <th style="width: 48px; text-align: center;">默认</th>
                  <th style="width: 130px;">服务标识</th>
                  <th>前置地址 (URL)</th>
                  <th style="width: 150px;">说明</th>
                  <th style="width: 38px;"></th>
                </tr>
              </thead>
              <tbody>
                {#if $currentEnvironment.base_urls.length === 0}
                  <tr>
                    <td colspan="5" class="kv-empty-cell">暂无前置 URL，点击右上角「+ 添加地址」配置</td>
                  </tr>
                {:else}
                  {#each $currentEnvironment.base_urls as b, idx}
                    <tr class="kv-row">
                      <td style="text-align: center;">
                        <input
                          type="radio"
                          name="main_base_url"
                          checked={b.enabled}
                          onchange={() => {
                            $currentEnvironment!.base_urls.forEach((u, i) => (u.enabled = i === idx));
                          }}
                        />
                      </td>
                      <td><input type="text" class="kv-key" bind:value={b.key} placeholder="default" /></td>
                      <td><input type="text" class="kv-val" bind:value={b.url} placeholder="https://api.example.com" /></td>
                      <td><input type="text" class="kv-val" bind:value={b.description} placeholder="可选说明" /></td>
                      <td style="text-align: center;">
                        <button type="button" class="kv-del" onclick={() => removeBaseUrl(idx)} title="删除">×</button>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>

          <!-- Variables Section -->
          <div class="env-section">
            <div class="env-section-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="env-section-title">环境变量</span>
                <code class="code-chip">{`{{key}}`}</code>
              </div>
              <button type="button" class="kv-add-inline" onclick={addVariable}>
                + 添加变量
              </button>
            </div>

            <table class="kv-table">
              <thead>
                <tr>
                  <th style="width: 48px; text-align: center;">启用</th>
                  <th style="width: 160px;">变量名 (Key)</th>
                  <th>变量值 (Value)</th>
                  <th style="width: 52px; text-align: center;">保密</th>
                  <th style="width: 38px;"></th>
                </tr>
              </thead>
              <tbody>
                {#if $currentEnvironment.variables.length === 0}
                  <tr>
                    <td colspan="5" class="kv-empty-cell">暂无环境变量，点击右上角「+ 添加变量」配置</td>
                  </tr>
                {:else}
                  {#each $currentEnvironment.variables as v, idx}
                    <tr class="kv-row">
                      <td style="text-align: center;"><input type="checkbox" bind:checked={v.enabled} /></td>
                      <td><input type="text" class="kv-key" bind:value={v.key} placeholder="token" /></td>
                      <td>
                        <input
                          type={v.is_secret ? 'password' : 'text'}
                          class="kv-val"
                          bind:value={v.value}
                          placeholder="变量值"
                        />
                      </td>
                      <td style="text-align: center;"><input type="checkbox" bind:checked={v.is_secret} title="隐藏敏感值" /></td>
                      <td style="text-align: center;">
                        <button type="button" class="kv-del" onclick={() => removeVariable(idx)} title="删除">×</button>
                      </td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <div class="modal-footer" style="justify-content: flex-end; gap: 8px;">
        <button type="button" class="ctrl-btn ghost" onclick={() => showEnvModal.set(false)}>取消</button>
        <button type="button" class="ctrl-btn primary" disabled={!$currentEnvironment} onclick={saveEnvironment}>
          保存配置
        </button>
      </div>
    </div>
  </div>
{/if}
