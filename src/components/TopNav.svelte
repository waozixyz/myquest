<script lang="ts">
    export let isLoggedIn: boolean;
    export let username: string;
    export let onLoginClick: () => void;
    export let onLogoutClick: () => void;
    export let onSettingsClick: () => void;
  </script>
  
  <nav class="top-nav">
    <div class="nav-logo">🚀 Cosmic Todos</div>
    <div class="nav-actions">
      {#if isLoggedIn}
        <span class="username">Welcome, {username}</span>
        <button on:click={onLogoutClick} class="nav-button logout-button">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      {:else}
        <button on:click={onLoginClick} class="nav-button login-button">
          <i class="fab fa-telegram"></i> Login with Telegram
        </button>
      {/if}
      <button on:click={onSettingsClick} class="nav-button settings-button">
        <i class="fas fa-cog"></i> Settings
      </button>
    </div>
  </nav>
  
<style>

.top-nav {
  max-width: 800px;
  width: 90%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(90deg, rgba(20, 20, 40, 0.8), rgba(40, 20, 60, 0.8));
  border-radius: 15px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 15px rgba(255, 58, 134, 0.2);
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--accent-color);
  text-shadow: 0 0 10px rgba(255, 58, 134, 0.5);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-button {
  background-color: transparent;
  color: var(--text-color);
  border: 2px solid var(--accent-color);
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 25px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.nav-button:hover {
  background-color: var(--accent-color);
  color: var(--bg-color);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(255, 58, 134, 0.3);
}

.login-button {
  background-color: var(--accent-color);
  color: var(--bg-color);
}

.logout-button, .settings-button {
  background-color: var(--secondary-color);
}

.username {
  color: var(--text-color);
  font-weight: bold;
}
@media (max-width: 600px) {

    .top-nav {
        flex-direction: column;
        gap: 1rem;
    }

    .nav-actions {
        width: 100%;
        justify-content: space-between;
    }

    .nav-button {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
    }
}
</style>
