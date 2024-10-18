import { writable } from 'svelte/store';

export const activeTab = writable(new Date().getDay());
export const notification = writable({ message: '', type: '' });
export const isLoggedIn = writable(false);
export const username = writable('');

export function showNotification(message: string, type: 'success' | 'error') {
  notification.set({ message, type });
  setTimeout(() => notification.set({ message: '', type: '' }), 3000);
}
