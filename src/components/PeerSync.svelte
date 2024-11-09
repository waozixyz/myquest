<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { writable } from "svelte/store";
    import Peer from 'peerjs';
    
    export let onConnect: (peerId: string) => void;
    
    let peer: Peer;
    let peerId = writable<string>('');
    let connectId = '';
    let connections = [];
    let syncStatus = writable<'disconnected' | 'connected'>('disconnected');
    
    onMount(() => {
        peer = new Peer();
        
        peer.on('open', (id) => {
            peerId.set(id);
            syncStatus.set('connected');
        });
    
        peer.on('connection', (conn) => {
            connections.push(conn);
            handleConnection(conn);
        });
    });
    
    onDestroy(() => {
        if (peer) {
            peer.destroy();
        }
    });
    
    function handleConnection(conn) {
        conn.on('data', (data) => {
            // Handle incoming todo updates
            console.log('Received data:', data);
            // You'll need to implement todo sync logic here
        });
    }
    
    function connectToPeer() {
        if (!connectId) return;
        
        const conn = peer.connect(connectId);
        connections.push(conn);
        
        conn.on('open', () => {
            handleConnection(conn);
            onConnect(connectId);
        });
    }
    </script>
    
    <div class="peer-sync">
        {#if $syncStatus === 'connected'}
            <div class="sync-code">
                <p>Your sync code:</p>
                <code>{$peerId}</code>
                <button on:click={() => navigator.clipboard.writeText($peerId)}>
                    Copy
                </button>
            </div>
        {:else}
            <div class="loader"></div>
        {/if}
    
        <div class="connect-form">
            <input 
                type="text" 
                bind:value={connectId} 
                placeholder="Enter sync code to connect"
            />
            <button on:click={connectToPeer}>Connect</button>
        </div>
    </div>
    
    <style>
    .peer-sync {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }
    
    .sync-code {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .connect-form {
        display: flex;
        gap: 0.5rem;
    }
    
    code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
    }
    
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
    </style>
    