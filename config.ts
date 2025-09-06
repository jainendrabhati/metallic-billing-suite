// Add this to tell TypeScript about Electron's window.process
declare global {
  interface Window {
    process?: {
      type?: string;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Detect if running inside Electron
const isElectron = typeof window !== 'undefined' && !!window.process?.type;

export const API_BASE_URL = isElectron
  ? 'http://127.0.0.1:5000/api'  // Local backend for Electron
  : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';
