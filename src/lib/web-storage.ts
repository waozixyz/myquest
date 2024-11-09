import type { StorageInterface, Todo } from './storage-interface';
import Peer from 'peerjs';

export class WebStorage implements StorageInterface {
    private peer: Peer | null = null;
    private connections: Peer.DataConnection[] = [];
    private peerId: string | null = null;

    constructor() {
        this.loadPeerState();
    }

    private getStorageKey(day: string): string {
        return `todos_${day}`;
    }

    private loadPeerState(): void {
        const storedPeerId = localStorage.getItem('peerId');
        if (storedPeerId) {
            this.peerId = storedPeerId;
            this.initializePeer(storedPeerId);
        }
    }

    private initializePeer(existingPeerId?: string) {
        this.peer = new Peer(existingPeerId);
        
        this.peer.on('open', (id) => {
            this.peerId = id;
            localStorage.setItem('peerId', id);
        });

        this.peer.on('connection', this.handleNewConnection.bind(this));
    }

    private handleNewConnection(conn: Peer.DataConnection) {
        this.connections.push(conn);
        
        conn.on('data', async (data: any) => {
            if (data.type === 'sync_request') {
                const allData = await this.exportData();
                conn.send({ type: 'sync_response', data: allData });
            } else if (data.type === 'sync_response') {
                await this.importData(data.data);
            } else if (data.type === 'todo_update') {
                await this.handleRemoteTodoUpdate(data.todo, data.action);
            }
        });

        conn.on('close', () => {
            this.connections = this.connections.filter(c => c !== conn);
        });
    }

    private async handleRemoteTodoUpdate(todo: Todo, action: 'add' | 'delete' | 'move') {
        switch (action) {
            case 'add':
                await this.addTodo(todo, false);
                break;
            case 'delete':
                await this.deleteTodo(todo.id!, false);
                break;
            case 'move':
                await this.moveTodoToDay(todo, todo.day, false);
                break;
        }
    }

    private broadcastTodoUpdate(todo: Todo, action: 'add' | 'delete' | 'move') {
        this.connections.forEach(conn => {
            conn.send({ type: 'todo_update', todo, action });
        });
    }

    async getTodos(day: string): Promise<Todo[]> {
        const storageKey = this.getStorageKey(day);
        const todosJson = localStorage.getItem(storageKey);
        return todosJson ? JSON.parse(todosJson) : [];
    }

    async addTodo(todo: Todo, broadcast: boolean = true): Promise<void> {
        const todos = await this.getTodos(todo.day);
        todo.id = Date.now();
        todos.push(todo);
        localStorage.setItem(this.getStorageKey(todo.day), JSON.stringify(todos));
        
        if (broadcast) {
            this.broadcastTodoUpdate(todo, 'add');
        }
    }

    async deleteTodo(id: number, broadcast: boolean = true): Promise<void> {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        for (const day of days) {
            const todos = await this.getTodos(day);
            const todoToDelete = todos.find(t => t.id === id);
            const updatedTodos = todos.filter(todo => todo.id !== id);
            if (updatedTodos.length !== todos.length) {
                localStorage.setItem(this.getStorageKey(day), JSON.stringify(updatedTodos));
                if (broadcast && todoToDelete) {
                    this.broadcastTodoUpdate(todoToDelete, 'delete');
                }
                break;
            }
        }
    }

    async moveTodoToDay(todo: Todo, newDay: string, broadcast: boolean = true): Promise<void> {
        let currentDayTodos = await this.getTodos(todo.day);
        currentDayTodos = currentDayTodos.filter(t => t.id !== todo.id);
        localStorage.setItem(this.getStorageKey(todo.day), JSON.stringify(currentDayTodos));
        
        const newDayTodos = await this.getTodos(newDay);
        const updatedTodo = { ...todo, day: newDay };
        newDayTodos.push(updatedTodo);
        localStorage.setItem(this.getStorageKey(newDay), JSON.stringify(newDayTodos));
        
        if (broadcast) {
            this.broadcastTodoUpdate(updatedTodo, 'move');
        }
    }

    async connectPeer(peerId?: string): Promise<string> {
        if (peerId) {
            if (!this.peer) {
                this.initializePeer();
            }
            const conn = this.peer!.connect(peerId);
            this.handleNewConnection(conn);
            return this.peerId!;
        } else {
            if (!this.peer) {
                this.initializePeer();
            }
            return new Promise((resolve) => {
                this.peer!.on('open', (id) => {
                    resolve(id);
                });
            });
        }
    }

    async disconnectPeer(): Promise<void> {
        this.connections.forEach(conn => conn.close());
        this.connections = [];
        this.peer?.destroy();
        this.peer = null;
        this.peerId = null;
        localStorage.removeItem('peerId');
    }

    isPeerConnected(): boolean {
        return this.peer !== null && this.connections.length > 0;
    }

    getPeerId(): string | null {
        return this.peerId;
    }

    async sync(): Promise<void> {
        if (!this.isPeerConnected()) {
            throw new Error('No peer connections available');
        }
        this.connections.forEach(conn => {
            conn.send({ type: 'sync_request' });
        });
    }

    async exportData(): Promise<string> {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let allTodos: Todo[] = [];
        for (const day of days) {
            const dayTodos = await this.getTodos(day);
            allTodos = allTodos.concat(dayTodos);
        }
        return JSON.stringify(allTodos);
    }

    async importData(data: string): Promise<void> {
        const importedData: Todo[] = JSON.parse(data);
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        for (const day of days) {
            const dayTodos = importedData.filter(todo => todo.day === day);
            localStorage.setItem(this.getStorageKey(day), JSON.stringify(dayTodos));
        }
    }

    async updateTodoOrder(day: string, todos: Todo[]): Promise<void> {
        localStorage.setItem(this.getStorageKey(day), JSON.stringify(todos));
    }
}
