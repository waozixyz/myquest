<script lang="ts">
    import { onMount } from "svelte";
    import PeerSync from "./PeerSync.svelte";
    import { connectPeer } from "../stores/authStore";
    
    async function handlePeerConnect(peerId: string) {
        await connectPeer(peerId);
    }
    
    let isLoading = true;
    
    onMount(() => {
        const timer = setTimeout(() => {
            isLoading = false;
        }, 1000);
        return () => clearTimeout(timer);
    });
    </script>
    
    <h2>Connect Device</h2>
    
    {#if isLoading}
        <div class="loader"></div>
    {/if}
    
    <div class:visually-hidden={isLoading}>
        <PeerSync onConnect={handlePeerConnect} />
    </div>
    
    <style>
    .loader {
        border: 4px solid var(--secondary-color);
        border-top: 4px solid var(--accent-color);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .visually-hidden {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    }
    </style>