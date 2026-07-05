<script lang="ts">
  import type { Snippet } from 'svelte';

  interface MenuItem {
    label: string;
    title: string;
    onClick: () => void;
    danger?: boolean;
  }

  let { x, y, items, children }: { x: number; y: number; items: MenuItem[]; children?: Snippet } = $props();
</script>

<div class="context-menu" style="left:{x}px; top:{y}px;" onpointerdown={(e) => e.stopPropagation()}>
  {#if children}
    <div class="extra">{@render children()}</div>
  {/if}
  <div class="buttons">
    {#each items as item (item.title)}
      <button
        type="button"
        class="menu-btn"
        class:danger={item.danger}
        onclick={item.onClick}
        title={item.title}
        aria-label={item.title}
      >
        {item.label}
      </button>
    {/each}
  </div>
  <div class="arrow"></div>
</div>

<style>
  .context-menu {
    position: absolute;
    transform: translate(-50%, calc(-100% - 14px));
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 6px;
    box-shadow: var(--shadow);
    z-index: 15;
    white-space: nowrap;
  }
  .extra {
    padding: 2px;
  }
  .buttons {
    display: flex;
    gap: 4px;
  }
  .menu-btn {
    background: transparent;
    border: none;
    color: var(--text);
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 19px;
    line-height: 1;
  }
  .menu-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .menu-btn.danger {
    color: var(--danger);
  }
  .menu-btn.danger:hover {
    background: rgba(248, 113, 113, 0.15);
  }
  .arrow {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 10px;
    height: 10px;
    background: var(--panel-2);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
</style>
