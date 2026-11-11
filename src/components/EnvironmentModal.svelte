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
      key: `service_${$currentEnvironment.base_urls.length + 1}`,
      url: 'http://localhost:8080',
      description: '',
      enabled: false,
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
    const name = prompt('请输入新环境名称：', '测试环境');
    if (!name?.trim()) return;

    const newEnv = {
      id: crypto.randomUUID(),
      project_id: $currentProject.id,
      name: name.trim(),
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

{#if $showEnvModal && $currentEnvironment}
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
        <span class="modal-title">环境变量与前置 URL 管理</span>
        <button type="button" class="leaf-action-btn" onclick={() => showEnvModal.set(false)} title="关闭">×</button>
      </div>

      <div class="modal-body">
        <div style="display: flex; gap: 16px; align-items: flex-end;">
          <div style="flex: 1;">
            <label for="envNameInput" style="display: block; font-size: 12px; margin-bottom: 6px; color: var(--text-secondary);">环境名称</label>
            <input id="envNameInput" type="text" class="ctrl-input" style="width: 100%;" bind:value={$currentEnvironment.name} />
          </div>
          <div style="display: flex; align-items: center; padding-bottom: 8px;">
            <label style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
              <input type="checkbox" bind:checked={$currentEnvironment.is_production} />
              <span style="color: var(--status-err); font-weight: 600;">标记为生产环境 (PROD 保护)</span>
            </label>
          </div>
        </div>

        <!-- Base URLs Section -->
        <div>
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">
            服务前置 URL ({`{{baseUrl}}`})
          </div>
          <table class="kv-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">主</th>
                <th style="width: 110px;">服务标识</th>
                <th>前置地址 (URL)</th>
                <th>说明</th>
                <th style="width: 36px;"></th>
              </tr>
            </thead>
            <tbody>
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
                  <td><input type="text" class="kv-key" bind:value={b.key} /></td>
                  <td><input type="text" class="kv-val" bind:value={b.url} placeholder="https://api.example.com" /></td>
                  <td><input type="text" class="kv-val" bind:value={b.description} placeholder="说明" /></td>
                  <td style="text-align: center;"><button type="button" class="kv-del" onclick={() => removeBaseUrl(idx)}>×</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <button type="button" class="ctrl-btn ghost" style="margin-top: 8px; font-size: 12px;" onclick={addBaseUrl}>
            + 添加服务地址
          </button>
        </div>

        <!-- Variables Section -->
        <div>
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">
            键值变量表 (在 URL / Header / Body 中使用 {`{{key}}`})
          </div>
          <table class="kv-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">启用</th>
                <th style="width: 130px;">变量名 (Key)</th>
                <th>变量值 (Value)</th>
                <th style="width: 50px; text-align: center;">保密</th>
                <th style="width: 36px;"></th>
              </tr>
            </thead>
            <tbody>
              {#each $currentEnvironment.variables as v, idx}
                <tr class="kv-row">
                  <td style="text-align: center;"><input type="checkbox" bind:checked={v.enabled} /></td>
                  <td><input type="text" class="kv-key" bind:value={v.key} placeholder="token" /></td>
                  <td>
                    <input
                      type={v.is_secret ? 'password' : 'text'}
                      class="kv-val"
                      bind:value={v.value}
                      placeholder="值"
                    />
                  </td>
                  <td style="text-align: center;"><input type="checkbox" bind:checked={v.is_secret} title="标记为保密变量" /></td>
                  <td style="text-align: center;"><button type="button" class="kv-del" onclick={() => removeVariable(idx)}>×</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <button type="button" class="ctrl-btn ghost" style="margin-top: 8px; font-size: 12px;" onclick={addVariable}>
            + 添加变量
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="ctrl-btn" onclick={createNewEnvironment}>
          + 新建另一个环境
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="ctrl-btn ghost" onclick={() => showEnvModal.set(false)}>取消</button>
          <button type="button" class="ctrl-btn primary" onclick={saveEnvironment}>保存配置</button>
        </div>
      </div>
    </div>
  </div>
{/if}
