import type { StorageInterface, Todo } from './storage-interface';
import Peer from 'peerjs';
import type { DataConnection, PeerOptions} from "peerjs";

export class WebStorage implements StorageInterface {
    private peer: Peer | null = null;
    private connections: DataConnection[] = [];
    private peerId: string | null = null;
    private syncStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

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
        const peerOptions: PeerOptions = {
            debug: 2, // Log level
            host: 'localhost', // Your PeerJS server host
            port: 9000, // Your PeerJS server port
            path: '/myapp' // Your PeerJS server path
        };
    
        this.peer = existingPeerId ? 
            new Peer(existingPeerId, peerOptions) : 
            new Peer(peerOptions);
            
        this.peer.on('open', (id) => {
            this.peerId = id;
            localStorage.setItem('peerId', id);
        });
    
        this.peer.on('connection', this.handleNewConnection.bind(this));
    }
    private async handleNewConnection(conn: DataConnection) {
        const connectionId = conn.peer;
        console.log('New connection established with peer:', connectionId);
        this.connections.push(conn);

        conn.on('data', async (data: any) => {
            try {
                if (typeof data !== 'object') {
                    console.error('Invalid data format received');
                    return;
                }

                switch (data.type) {
                    case 'SYNC_REQUEST':
                    case 'sync_request':
                        const todos = await this.exportData();
                        conn.send({
                            type: 'SYNC_RESPONSE',
                            todos: JSON.parse(todos)
                        });
                        break;

                    case 'SYNC_RESPONSE':
                    case 'sync_response':
                        if (data.todos) {
                            await this.mergeTodos(data.todos);
                        } else if (data.data) {
                            await this.importData(data.data);
                        }
                        break;

                    case 'TODO_ADDED':
                    case 'todo_update':
                        if (data.todo) {
                            if (data.action === 'add' || data.type === 'TODO_ADDED') {
                                await this.addTodo(data.todo, false);
                            } else if (data.action === 'delete') {
                                await this.deleteTodo(data.todo.id!, false);
                            } else if (data.action === 'move') {
                                await this.moveTodoToDay(data.todo, data.todo.day, false);
                            }
                        }
                        break;

                    case 'TODO_DELETED':
                        if (data.todoId) {
                            await this.deleteTodo(data.todoId, false);
                        }
                        break;

                    case 'TODO_MOVED':
                        if (data.todo && data.newDay) {
                            await this.moveTodoToDay(data.todo, data.newDay, false);
                        }
                        break;

                    case 'TODO_ORDER_UPDATED':
                        if (data.day && Array.isArray(data.todos)) {
                            await this.updateTodoOrder(data.day, data.todos, false);
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
            this.connections = this.connections.filter(c => c !== conn);
            if (this.connections.length === 0) {
                this.syncStatus = 'disconnected';
            }
        });

        conn.on('error', (error: any) => {
            console.error('Connection error with peer:', connectionId, error);
            this.connections = this.connections.filter(c => c !== conn);
            if (this.connections.length === 0) {
                this.syncStatus = 'disconnected';
            }
        });

        // Initial sync request
        conn.send({
            type: 'SYNC_REQUEST'
        });
    }

    private async mergeTodos(receivedTodos: Todo[]) {
        const currentData = await this.exportData();
        const currentTodos = JSON.parse(currentData) as Todo[];
        
        // Create a map of existing todos by ID
        const existingTodos = new Map(currentTodos.map(todo => [todo.id, todo]));
        
        // Merge received todos, keeping the most recently modified version
        for (const receivedTodo of receivedTodos) {
            const existingTodo = existingTodos.get(receivedTodo.id);
            if (!existingTodo || 
                (receivedTodo.lastModified && existingTodo.lastModified && 
                 new Date(receivedTodo.lastModified) > new Date(existingTodo.lastModified))) {
                existingTodos.set(receivedTodo.id!, receivedTodo);
            }
        }
        
        // Convert back to array and import
        const mergedTodos = Array.from(existingTodos.values());
        await this.importData(JSON.stringify(mergedTodos));
    }

    private broadcastToPeers(message: any) {
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(message);
            }
        });
    }

    private broadcastTodoUpdate(todo: Todo, action: 'add' | 'delete' | 'move') {
        this.broadcastToPeers({ 
            type: 'todo_update', 
            todo, 
            action 
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
        todo.lastModified = new Date().toISOString();
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
        const updatedTodo = { ...todo, day: newDay, lastModified: new Date().toISOString() };
        newDayTodos.push(updatedTodo);
        localStorage.setItem(this.getStorageKey(newDay), JSON.stringify(newDayTodos));
        
        if (broadcast) {
            this.broadcastTodoUpdate(updatedTodo, 'move');
        }
    }

    async connectPeer(peerId?: string): Promise<string> {
        this.syncStatus = 'connecting';
        
        try {
            if (peerId) {
                if (!this.peer) {
                    this.initializePeer();
                }
                
                return new Promise((resolve, reject) => {
                    const conn = this.peer!.connect(peerId);
                    
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                        this.syncStatus = 'disconnected';
                    }, 5000);

                    conn.on('open', () => {
                        clearTimeout(timeout);
                        this.handleNewConnection(conn);
                        this.syncStatus = 'connected';
                        resolve(this.peerId!);
                    });

                    conn.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                        this.syncStatus = 'disconnected';
                    });
                });
            } else {
                if (!this.peer) {
                    this.initializePeer();
                }
                return new Promise((resolve) => {
                    this.peer!.on('open', (id) => {
                        this.syncStatus = 'connected';
                        resolve(id);
                    });
                });
            }
        } catch (error) {
            this.syncStatus = 'disconnected';
            throw error;
        }
    }

    async disconnectPeer(): Promise<void> {
        this.connections.forEach(conn => conn.close());
        this.connections = [];
        this.peer?.destroy();
        this.peer = null;
        this.peerId = null;
        this.syncStatus = 'disconnected';
        localStorage.removeItem('peerId');
    }

    isPeerConnected(): boolean {
        return this.syncStatus === 'connected' && this.peer !== null && this.connections.length > 0;
    }

    getPeerId(): string | null {
        return this.peerId;
    }

    getSyncStatus(): 'disconnected' | 'connecting' | 'connected' {
        return this.syncStatus;
    }

    async sync(): Promise<void> {
        if (!this.isPeerConnected()) {
            throw new Error('No peer connections available');
        }
        this.broadcastToPeers({ type: 'SYNC_REQUEST' });
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

    async updateTodoOrder(day: string, todos: Todo[], broadcast: boolean = true): Promise<void> {
        todos = todos.map(todo => ({
            ...todo,
            lastModified: new Date().toISOString()
        }));
        localStorage.setItem(this.getStorageKey(day), JSON.stringify(todos));
        
        if (broadcast) {
            this.broadcastToPeers({
                type: 'TODO_ORDER_UPDATED',
                day,
                todos
            });
        }
    }
}