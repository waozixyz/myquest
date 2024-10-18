<script lang="ts">
  import { modalStore } from '../stores/modalStore';
  import { fade, fly } from 'svelte/transition';

  function closeModal() {
    modalStore.close();
  }
</script>

{#if $modalStore.isOpen}
  <div class="modal-overlay" on:click={closeModal} transition:fade={{ duration: 200 }}>
    <div 
      class="modal" 
      on:click|stopPropagation 
      transition:fly={{ y: -50, duration: 200 }}
    >
      <div class="modal-content">
        <slot></slot>
      </div>
      <button class="close-button" on:click={closeModal}>
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(10, 10, 42, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }
  .modal {
    background: linear-gradient(135deg, #1a1a4a, #2a1a5a);
    border-radius: 20px;
    padding: 2rem;
    max-width: 90%;
    width: 400px;
    box-shadow: 0 0 30px rgba(255, 58, 134, 0.3);
    position: relative;
  }
  .modal-content {
    max-height: 80vh;
    overflow-y: auto;
  }
  .close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.3s ease;
  }
  .close-button:hover {
    color: var(--accent-color);
  }
</style>