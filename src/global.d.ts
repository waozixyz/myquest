declare global {
  interface Window {
    handleTelegramAuth: (user: any) => void;
  }
}
export {};
