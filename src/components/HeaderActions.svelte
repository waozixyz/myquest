<script lang="ts">
    import { modalStore } from "../stores/modalStore";
    import { isLoggedIn, logout } from "../stores/authStore";
    import logInIcon from "../assets/log-in.svg";
    import logOutIcon from "../assets/log-out.svg";
    import infoIcon from "../assets/info-circle.svg";
    import settingsIcon from "../assets/settings.svg";

    function openModal(type: "signIn" | "info" | "settings") {
        modalStore.open(type);
    }
    function handleSignOut() {
        logout();
    }
</script>

<div class="header-buttons">
    {#if !$isLoggedIn}
        <button
            class="icon-button"
            on:click={() => openModal("signIn")}
            title="Sign In"
        >
            <img src={logInIcon} alt="Sign In" class="icon" />
        </button>
    {:else}
        <button class="icon-button" on:click={handleSignOut} title="Sign Out">
            <img src={logOutIcon} alt="Sign Out" class="icon" />
        </button>
    {/if}
    <button class="icon-button" on:click={() => openModal("info")} title="Info">
        <img src={infoIcon} alt="Info" class="icon" />
    </button>
    <button
        class="icon-button"
        on:click={() => openModal("settings")}
        title="Settings"
    >
        <img src={settingsIcon} alt="Settings" class="icon" />
    </button>
</div>

<style>
    .header-buttons {
        display: flex;
        gap: 0.5rem;
    }
    .icon-button img {
        filter: invert(1);
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
    .icon {
        width: 20px;
        height: 20px;
    }
</style>
