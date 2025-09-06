// Check if running in Electron or desktop environment
const isElectron = typeof window !== 'undefined' && 
  ((window as any).electronAPI || 
   (window as any).process?.type === 'renderer' ||
   navigator.userAgent.toLowerCase().includes('electron'));

// Always use localhost for better local communication
export const API_BASE_URL = 'http://localhost:5000/api';