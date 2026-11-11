<script lang="ts">
  export interface SelectOption {
    value: string;
    label: string;
    colorClass?: string;
    dotColor?: string;
  }

  interface Props {
    value: string;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    variant?: 'default' | 'method' | 'compact';
    ariaLabel?: string;
    minWidth?: string;
    onchange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    options = [],
    placeholder = '请选择',
    disabled = false,
    variant = 'default',
    ariaLabel = '',
    minWidth = '',
    onchange,
  }: Props = $props();

  let isOpen = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let menuStyle = $state('');

  let selectedOption = $derived(
    options.find((o) => o.value === value) || null
  );

  function updateMenuPosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estHeight = Math.min(options.length * 32 + 10, 240);
    const openUp = spaceBelow < estHeight && rect.top > estHeight;

    const top = openUp ? rect.top - estHeight - 4 : rect.bottom + 4;
    const width = Math.max(rect.width, variant === 'method' ? 104 : 120);
    menuStyle = `top: ${Math.max(8, top)}px; left: ${rect.left}px; min-width: ${width}px;`;
  }

  function toggleOpen(e: MouseEvent) {
    e.stopPropagation();
    if (disabled || options.length === 0) return;
    if (!isOpen) {
      updateMenuPosition();
      isOpen = true;
    } else {
      isOpen = false;
    }
  }

  function selectItem(opt: SelectOption, e: MouseEvent) {
    e.stopPropagation();
    const changed = value !== opt.value;
    value = opt.value;
    isOpen = false;
    if (changed && onchange) {
      onchange(opt.value);
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (!isOpen) return;
    if (triggerEl && triggerEl.contains(e.target as Node)) return;
    isOpen = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      isOpen = false;
      triggerEl?.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen) {
      e.preventDefault();
      updateMenuPosition();
      isOpen = true;
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isOpen) {
      e.preventDefault();
      if (options.length === 0) return;
      const idx = options.findIndex((o) => o.value === value);
      const nextIdx =
        e.key === 'ArrowDown'
          ? (idx + 1) % options.length
          : (idx - 1 + options.length) % options.length;
      value = options[nextIdx].value;
      onchange?.(value);
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      isOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onresize={() => (isOpen = false)} onscroll={() => (isOpen = false)} />

<div class="cselect-root {variant}" style={minWidth ? `min-width: ${minWidth};` : ''}>
  <button
    type="button"
    bind:this={triggerEl}
    class="cselect-trigger {variant} {selectedOption?.colorClass || ''}"
    class:open={isOpen}
    disabled={disabled || options.length === 0}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-label={ariaLabel}
    onclick={toggleOpen}
    onkeydown={handleKeydown}
  >
    <span class="cselect-label">
      {#if selectedOption?.dotColor}
        <span class="cselect-dot" style="background: {selectedOption.dotColor};"></span>
      {/if}
      <span class="cselect-text">{selectedOption ? selectedOption.label : placeholder}</span>
    </span>
    <svg
      class="cselect-chevron"
      class:open={isOpen}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if isOpen}
    <div class="cselect-popover" role="listbox" style={menuStyle}>
      {#each options as opt}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          role="option"
          tabindex="-1"
          aria-selected={opt.value === value}
          class="cselect-option {opt.colorClass || ''}"
          class:selected={opt.value === value}
          onclick={(e) => selectItem(opt, e)}
        >
          <span class="cselect-opt-main">
            {#if opt.dotColor}
              <span class="cselect-dot" style="background: {opt.dotColor};"></span>
            {/if}
            <span>{opt.label}</span>
          </span>
          {#if opt.value === value}
            <svg class="cselect-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
