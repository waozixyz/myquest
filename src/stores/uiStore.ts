import { writable } from 'svelte/store';

const today = new Date().getDay();
const adjustedDay = today === 0 ? 6 : today - 1;
export const activeTab = writable(adjustedDay);
export const notification = writable({ message: '', type: '' });
export const isLoggedIn = writable(false);
export const username = writable('');

export function showNotification(message: string, type: 'success' | 'error') {
  notification.set({ message, type });
  setTimeout(() => notification.set({ message: '', type: '' }), 3000);
}
