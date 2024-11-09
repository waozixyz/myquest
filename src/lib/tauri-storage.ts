import { invoke } from "@tauri-apps/api/core";
import type { StorageInterface, Todo } from './storage-interface';

export class TauriStorage implements StorageInterface {
    private peerId: string | null = null;
    private deviceName: string | null = null;
    private deviceType: string | null = null;
    private connectedPeers: string[] = [];

    constructor() {
        this.loadPeerState();
        this.initializeDeviceInfo();
    }

    private async initializeDeviceInfo() {
        // You can customize how to get device info
        this.deviceName = this.getDeviceName();
        this.deviceType = this.getDeviceType();
    }

    private getDeviceName(): string {
        // You can customize this based on your needs
        return `Device-${Math.random().toString(36).substring(7)}`;
    }

    private getDeviceType(): string {
        // Basic device type detection
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
            const storedPeerId: string | null = await invoke('get_peer_id');
            this.peerId = storedPeerId;
            const isConnected: boolean = await invoke('is_peer_connected');
            if (!isConnected) {
                this.peerId = null;
            }
        } catch (error) {
            console.error('Failed to load peer state:', error);
        }
    }

    async getTodos(day: string): Promise<Todo[]> {
        return await invoke('get_todos', { day });
    }

    async addTodo(todo: Todo): Promise<void> {
        await invoke('add_todo', { todo });
        if (this.isPeerConnected()) {
            await this.sync();
        }
    }

    async deleteTodo(id: number): Promise<void> {
        await invoke('delete_todo', { id });
        if (this.isPeerConnected()) {
            await this.sync();
        }
    }

    async moveTodoToDay(todo: Todo, newDay: string): Promise<void> {
        await invoke('move_todo_to_day', { todo, newDay });
        if (this.isPeerConnected()) {
            await this.sync();
        }
    }

    async connectPeer(peerId?: string): Promise<string> {
        const result: string = await invoke('connect_peer', { 
            peerId,
            deviceName: this.deviceName,
            deviceType: this.deviceType
        });
        this.peerId = result;
        if (peerId) {
            this.connectedPeers.push(peerId);
        }
        // Trigger initial sync after connection
        await this.sync();
        return result;
    }

    async disconnectPeer(targetPeerId?: string): Promise<void> {
        const peerToDisconnect = targetPeerId || this.peerId;
        if (peerToDisconnect) {
            await invoke('disconnect_peer', { peerId: peerToDisconnect });
            this.connectedPeers = this.connectedPeers.filter(p => p !== peerToDisconnect);
            if (!targetPeerId) {
                this.peerId = null;
            }
        }
    }

    isPeerConnected(): boolean {
        return this.peerId !== null && this.connectedPeers.length > 0;
    }

    getPeerId(): string | null {
        return this.peerId;
    }

    getConnectedPeers(): string[] {
        return [...this.connectedPeers];
    }

    async sync(): Promise<void> {
        if (!this.isPeerConnected()) {
            throw new Error('No peer connection available');
        }
        await invoke('sync_todos');
    }

    async exportData(): Promise<string> {
        return await invoke('export_data');
    }

    async importData(data: string): Promise<void> {
        await invoke('import_data', { data });
        if (this.isPeerConnected()) {
            await this.sync();
        }
    }

    async updateTodoOrder(day: string, todos: Todo[]): Promise<void> {
        await invoke('update_todo_order', { day, todos });
        if (this.isPeerConnected()) {
            await this.sync();
        }
    }

    // New helper methods
    async reconnectToPeers(): Promise<void> {
        for (const peerId of this.connectedPeers) {
            try {
                await this.connectPeer(peerId);
            } catch (error) {
                console.error(`Failed to reconnect to peer ${peerId}:`, error);
            }
        }
    }

    // Method to handle connection state changes
    private async handleConnectionStateChange(connected: boolean) {
        if (connected && this.connectedPeers.length > 0) {
            await this.reconnectToPeers();
        }
    }
}