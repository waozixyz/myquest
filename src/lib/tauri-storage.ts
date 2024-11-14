import { invoke } from "@tauri-apps/api/core";
import type { StorageInterface, Todo } from './storage-interface';

export class TauriStorage implements StorageInterface {
    private peerId: string | null = null;
    private deviceName: string | null = null;
    private deviceType: string | null = null;
    private connectedPeers: string[] = [];
    private syncStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
    private reconnectAttempts: Map<string, number> = new Map();
    private readonly MAX_RECONNECT_ATTEMPTS = 3;
    private readonly RECONNECT_INTERVAL = 5000; // 5 seconds

    constructor() {
        this.loadPeerState();
        this.initializeDeviceInfo();
    }

    private async initializeDeviceInfo() {
        this.deviceName = this.getDeviceName();
        this.deviceType = this.getDeviceType();
        
        // Start checking connection status periodically
        setInterval(async () => {
            const isConnected = await invoke<boolean>('is_peer_connected');
            if (isConnected !== (this.syncStatus === 'connected')) {
                await this.handleConnectionStateChange(isConnected);
            }
        }, 10000); // Check every 10 seconds
    }

    private getDeviceName(): string {
        const platform = navigator.platform;
        const uniqueId = Math.random().toString(36).substring(7);
        return `${platform}-${uniqueId}`;
    }

    private getDeviceType(): string {
        if (typeof window !== 'undefined') {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                return 'mobile';
            }
            return 'desktop';
        }
        return 'unknown';
    }

    private async loadPeerState(): Promise<void> {
        try {
            this.syncStatus = 'connecting';
            const storedPeerId = await invoke<string | null>('get_peer_id');
            this.peerId = storedPeerId;
            
            const isConnected = await invoke<boolean>('is_peer_connected');
            if (isConnected) {
                this.syncStatus = 'connected';
            } else {
                this.syncStatus = 'disconnected';
                this.peerId = null;
            }
        } catch (error) {
            console.error('Failed to load peer state:', error);
            this.syncStatus = 'disconnected';
        }
    }

    async getTodos(day: string): Promise<Todo[]> {
        try {
            return await invoke<Todo[]>('get_todos', { day });
        } catch (error) {
            console.error('Failed to get todos:', error);
            return [];
        }
    }

    async addTodo(todo: Todo): Promise<void> {
        try {
            await invoke('add_todo', { todo: {
                ...todo,
                lastModified: new Date().toISOString()
            }});
            if (this.isPeerConnected()) {
                await this.sync();
            }
        } catch (error) {
            console.error('Failed to add todo:', error);
            throw error;
        }
    }

    async deleteTodo(id: number): Promise<void> {
        try {
            await invoke('delete_todo', { id });
            if (this.isPeerConnected()) {
                await this.sync();
            }
        } catch (error) {
            console.error('Failed to delete todo:', error);
            throw error;
        }
    }

    async moveTodoToDay(todo: Todo, newDay: string): Promise<void> {
        try {
            await invoke('move_todo_to_day', { 
                todo: {
                    ...todo,
                    lastModified: new Date().toISOString()
                }, 
                newDay 
            });
            if (this.isPeerConnected()) {
                await this.sync();
            }
        } catch (error) {
            console.error('Failed to move todo:', error);
            throw error;
        }
    }

    async connectPeer(peerId?: string): Promise<string> {
        try {
            this.syncStatus = 'connecting';
            const result = await invoke<string>('connect_peer', { 
                peerId,
                deviceName: this.deviceName,
                deviceType: this.deviceType
            });
            
            this.peerId = result;
            if (peerId) {
                this.connectedPeers.push(peerId);
                this.reconnectAttempts.delete(peerId); // Reset reconnect attempts on successful connection
            }
            
            this.syncStatus = 'connected';
            await this.sync();
            return result;
        } catch (error) {
            this.syncStatus = 'disconnected';
            console.error('Failed to connect peer:', error);
            throw error;
        }
    }

    async disconnectPeer(targetPeerId?: string): Promise<void> {
        try {
            const peerToDisconnect = targetPeerId || this.peerId;
            if (peerToDisconnect) {
                await invoke('disconnect_peer', { peerId: peerToDisconnect });
                this.connectedPeers = this.connectedPeers.filter(p => p !== peerToDisconnect);
                this.reconnectAttempts.delete(peerToDisconnect);
                
                if (!targetPeerId) {
                    this.peerId = null;
                    this.syncStatus = 'disconnected';
                }
            }
        } catch (error) {
            console.error('Failed to disconnect peer:', error);
            throw error;
        }
    }

    isPeerConnected(): boolean {
        return this.syncStatus === 'connected' && this.peerId !== null && this.connectedPeers.length > 0;
    }

    getPeerId(): string | null {
        return this.peerId;
    }

    getConnectedPeers(): string[] {
        return [...this.connectedPeers];
    }

    getSyncStatus(): 'disconnected' | 'connecting' | 'connected' {
        return this.syncStatus;
    }

    async sync(): Promise<void> {
        if (!this.isPeerConnected()) {
            throw new Error('No peer connection available');
        }
        
        try {
            await invoke('sync_todos');
        } catch (error) {
            console.error('Failed to sync todos:', error);
            throw error;
        }
    }

    async exportData(): Promise<string> {
        try {
            return await invoke('export_data');
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    async importData(data: string): Promise<void> {
        try {
            await invoke('import_data', { data });
            if (this.isPeerConnected()) {
                await this.sync();
            }
        } catch (error) {
            console.error('Failed to import data:', error);
            throw error;
        }
    }

    async updateTodoOrder(day: string, todos: Todo[]): Promise<void> {
        try {
            const updatedTodos = todos.map(todo => ({
                ...todo,
                lastModified: new Date().toISOString()
            }));
            
            await invoke('update_todo_order', { 
                day, 
                todos: updatedTodos 
            });
            
            if (this.isPeerConnected()) {
                await this.sync();
            }
        } catch (error) {
            console.error('Failed to update todo order:', error);
            throw error;
        }
    }

    private async handleConnectionStateChange(connected: boolean) {
        if (connected && this.syncStatus !== 'connected') {
            this.syncStatus = 'connected';
            if (this.connectedPeers.length > 0) {
                await this.reconnectToPeers();
            }
        } else if (!connected && this.syncStatus === 'connected') {
            this.syncStatus = 'disconnected';
            // Optionally start reconnection process
            this.startReconnectionProcess();
        }
    }

    private async reconnectToPeers(): Promise<void> {
        for (const peerId of this.connectedPeers) {
            try {
                await this.connectPeer(peerId);
            } catch (error) {
                console.error(`Failed to reconnect to peer ${peerId}:`, error);
                await this.handleReconnectFailure(peerId);
            }
        }
    }

    private async handleReconnectFailure(peerId: string) {
        const attempts = this.reconnectAttempts.get(peerId) || 0;
        if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts.set(peerId, attempts + 1);
            setTimeout(() => {
                this.connectPeer(peerId).catch(console.error);
            }, this.RECONNECT_INTERVAL * (attempts + 1));
        } else {
            // Remove peer after max attempts
            await this.disconnectPeer(peerId);
        }
    }

    private startReconnectionProcess() {
        if (this.connectedPeers.length > 0) {
            setTimeout(() => {
                this.reconnectToPeers().catch(console.error);
            }, this.RECONNECT_INTERVAL);
        }
    }
}