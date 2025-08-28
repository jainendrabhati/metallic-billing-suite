/// <reference types="vite/client" />

// Extend the Window interface to include custom properties
declare global {
  interface Window {
    printWindowOpen?: boolean;
  }
}

export {};