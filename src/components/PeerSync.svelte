<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { writable, type Writable } from "svelte/store";
    import Peer from 'peerjs';
    import type { DataConnection } from "peerjs";
    import { getStorage } from '../lib/storage-factory';
    
    type SyncStatus = 'disconnected' | 'connecting' | 'connected';
    
    export let onConnect: (peerId: string) => void;
    let peer: Peer | null = null;
    let peerId = writable<string>('');
    let connectId = '';
    let connections: DataConnection[] = [];
    let syncStatus: Writable<SyncStatus> = writable('disconnected');
    let storage: Awaited<ReturnType<typeof getStorage>>;

    function isButtonDisabled(status: SyncStatus, id: string): boolean {
        return !id || status === "connecting" || status === "connected";
    }

    onMount(async () => {
        storage = await getStorage();
        initializePeer();
    });
    function initializePeer() {
        syncStatus.set('connecting');
        
        // Remove custom host configuration to use PeerJS's cloud broker
        const peerOptions = {
            debug: 2
        };

        peer = new Peer(peerOptions);
        
        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            syncStatus.set('disconnected');
        });

        const timeout = setTimeout(() => {
            if ($syncStatus === 'connecting') {
                console.error('PeerJS connection timeout');
                syncStatus.set('disconnected');
            }
        }, 5000);

        peer.on('open', (id) => {
            clearTimeout(timeout);
            console.log('PeerJS connected with ID:', id);
            peerId.set(id);
            syncStatus.set('connected');
        });

        peer.on('connection', (conn) => {
            connections = [...connections, conn];
            handleConnection(conn);
        });
    }
    onDestroy(() => {
        if (peer) {
            peer.destroy();
            connections = [];
            syncStatus.set('disconnected');
        }
    });

    function handleConnection(conn: DataConnection) {
        const connectionId = conn.peer;
        console.log('New connection established with peer:', connectionId);

        conn.on('data', async (data: any) => {
            try {
                if (typeof data !== 'object') {
                    console.error('Invalid data format received');
                    return;
                }

                switch (data.type) {
                    case 'SYNC_REQUEST':
                        const todos = await storage.exportData();
                        conn.send({
                            type: 'SYNC_RESPONSE',
                            todos: JSON.parse(todos)
                        });
                        break;

                    case 'SYNC_RESPONSE':
                        if (data.todos) {
                            await storage.importData(JSON.stringify(data.todos));
                        }
                        break;

                    default:
                        console.warn('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error handling peer data:', error);
            }
        });

        conn.on('close', () => {
            console.log('Connection closed with peer:', connectionId);
            connections = connections.filter(c => c !== conn);
            if (connections.length === 0) {
                syncStatus.set('disconnected');
            }
        });

        conn.on('error', (error) => {
            console.error('Connection error with peer:', connectionId, error);
            connections = connections.filter(c => c !== conn);
            if (connections.length === 0) {
                syncStatus.set('disconnected');
            }
        });

        // Initial sync request
        conn.send({
            type: 'SYNC_REQUEST'
        });
    }

    async function connectToPeer() {
        if (!connectId || !peer) return;
        
        try {
            syncStatus.set('connecting');
            const conn = peer.connect(connectId);
            
            const connectionTimeout = setTimeout(() => {
                if (!conn.open) {
                    syncStatus.set('disconnected');
                    throw new Error('Connection timeout');
                }
            }, 5000);

            conn.on('open', () => {
                clearTimeout(connectionTimeout);
                connections = [...connections, conn];
                handleConnection(conn);
                onConnect(connectId);
                syncStatus.set('connected');
            });

            conn.on('error', (err) => {
                clearTimeout(connectionTimeout);
                console.error('Connection error:', err);
                syncStatus.set('disconnected');
            });

            conn.on('close', () => {
                console.log('Connection closed');
                connections = connections.filter(c => c !== conn);
                if (connections.length === 0) {
                    syncStatus.set('disconnected');
                }
            });
        } catch (error) {
            console.error('Failed to connect:', error);
            syncStatus.set('disconnected');
        }
    }
</script>


<div class="peer-sync">
    {#if $syncStatus === 'connecting'}
        <div class="loader">
            <p>Connecting to peer...</p>
        </div>
    {:else if $syncStatus === 'connected'}
        <div class="sync-code">
            <p>Connected!</p>
            <p>Your sync code: <code>{$peerId}</code></p>
            <button on:click={() => navigator.clipboard.writeText($peerId)}>
                Copy Code
            </button>
        </div>
    {:else}

        <div class="connect-form">
            <input
                type="text"
                bind:value={connectId}
                placeholder="Enter sync code to connect"
            />
            <button 
                on:click={connectToPeer}
                disabled={isButtonDisabled($syncStatus, connectId)}
            >
                Connect
            </button>
        </div>
    {/if}
</div>

<style>
.peer-sync {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
}

.connect-form {
    display: flex;
    gap: 0.5rem;
}

.connect-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.loader {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sync-code {
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
}
</style>