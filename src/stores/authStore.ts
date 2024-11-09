import { writable } from "svelte/store";
import { getStorage } from "../lib/storage-factory";

function createAuthStore() {
    const { subscribe, set, update } = writable({
        isPeerConnected: false,
        peerId: null as string | null,
    });

    let storage: Awaited<ReturnType<typeof getStorage>>;
    
    async function initStorage() {
        if (!storage) {
            storage = await getStorage();
        }
    }

    return {
        subscribe,
        login: async (peerId?: string) => {
            await initStorage();
            const newPeerId = await storage.connectPeer(peerId);
            set({ isPeerConnected: true, peerId: newPeerId });
            return newPeerId;
        },
        logout: async () => {
            await initStorage();
            await storage.disconnectPeer();
            set({ isPeerConnected: false, peerId: null });
        },
        connectPeer: async (peerId?: string) => {
            await initStorage();
            const newPeerId = await storage.connectPeer(peerId);
            set({ isPeerConnected: true, peerId: newPeerId });
            return newPeerId;
        },
        disconnectPeer: async () => {
            await initStorage();
            await storage.disconnectPeer();
            set({ isPeerConnected: false, peerId: null });
        },
        checkConnection: async () => {
            await initStorage();
            const isPeerConnected = storage.isPeerConnected();
            const peerId = storage.getPeerId();
            set({ isPeerConnected, peerId });
        },
    };
}

export const authStore = createAuthStore();

export const isPeerConnected = {
    subscribe: (fn: (value: boolean) => void) =>
        authStore.subscribe((state) => fn(state.isPeerConnected)),
};

export const peerId = {
    subscribe: (fn: (value: string | null) => void) =>
        authStore.subscribe((state) => fn(state.peerId)),
};

export const { login, logout, connectPeer, disconnectPeer } = authStore;
