<script lang="ts">
    import { modalStore } from "../stores/modalStore";
    import { isPeerConnected, disconnectPeer } from "../stores/authStore";
    import logInIcon from "../assets/log-in.svg";
    import logOutIcon from "../assets/log-out.svg";
    import infoIcon from "../assets/info-circle.svg";
    import settingsIcon from "../assets/settings.svg";
    import syncIcon from "../assets/sync.svg"; // You'll need to add this icon
    
    function openModal(type: "signIn" | "info" | "settings") {
        modalStore.open(type);
    }
    
    async function handleDisconnect() {
        await disconnectPeer();
    }
    
    let issyncing = false;
    async function handleSync() {
        if (issyncing) return;
        issyncing = true;
        try {
            // You can add sync functionality here if needed
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated sync
        } finally {
            issyncing = false;
        }
    }
    </script>
    
    <div class="header-buttons">
        {#if !$isPeerConnected}
            <button
                class="icon-button"
                on:click={() => openModal("signIn")}
                title="Connect Device"
            >
                <img src={logInIcon} alt="Connect Device" class="icon" />
            </button>
        {:else}
            <button 
                class="icon-button" 
                on:click={handleDisconnect} 
                title="Disconnect Device"
            >
                <img src={logOutIcon} alt="Disconnect Device" class="icon" />
            </button>
            <button 
                class="icon-button {issyncing ? 'syncing' : ''}" 
                on:click={handleSync} 
                title="Sync"
                disabled={issyncing}
            >
                <img src={syncIcon} alt="Sync" class="icon" />
            </button>
        {/if}
        
        <button 
            class="icon-button" 
            on:click={() => openModal("info")} 
            title="Info"
        >
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
        flex-direction: row;
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
    
    .icon-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
    
    .icon {
        width: 20px;
        height: 20px;
    }
    
    .syncing .icon {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    </style>