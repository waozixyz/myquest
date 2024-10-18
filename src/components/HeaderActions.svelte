<script lang="ts">
    import { modalStore } from '../stores/modalStore';
    import { isLoggedIn, logout } from '../stores/authStore';
  
    function openModal(type: 'signIn' | 'info' | 'settings') {
      modalStore.open(type);
    }
  
    function handleSignOut() {
      logout();
    }
  </script>
  
  <div class="header-buttons">
    {#if !$isLoggedIn}
      <button class="icon-button" on:click={() => openModal('signIn')} title="Sign In">
        <i class="fas fa-sign-in-alt"></i>
      </button>
    {:else}
      <button class="icon-button" on:click={handleSignOut} title="Sign Out">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    {/if}
    <button class="icon-button" on:click={() => openModal('info')} title="Info">
      <i class="fas fa-info-circle"></i>
    </button>
    <button class="icon-button" on:click={() => openModal('settings')} title="Settings">
      <i class="fas fa-cog"></i>
    </button>
  </div>
  
  <style>
    .header-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .icon-button {
      background-color: var(--secondary-color);
      color: var(--text-color);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .icon-button:hover {
      background-color: var(--hover-color);
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(255, 58, 134, 0.3);
    }
  </style>