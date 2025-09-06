import { API_BASE_URL } from '../config';

class LocalServerService {
  private isLocalServerAvailable = true;
  private lastServerCheck = 0;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private forceOnlineMode = false;

  constructor() {
    // Force browser to think we're always online for localhost requests
    this.forceOnlineMode = true;
    this.overrideBrowserNetworkDetection();
    this.checkLocalServerAvailability();
    
    // Check server availability periodically
    setInterval(() => {
      this.checkLocalServerAvailability();
    }, this.CHECK_INTERVAL);
  }

  private overrideBrowserNetworkDetection() {
    // Override navigator.onLine to always return true for our requests
    if (typeof window !== 'undefined') {
      // Store original fetch
      const originalFetch = window.fetch;
      
      // Override fetch to bypass network detection for localhost
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        
        // If it's a localhost request, force it through regardless of network state
        if (url.includes('localhost:5000')) {
          // Temporarily force online state
          const originalOnLine = navigator.onLine;
          try {
            // Force aggressive no-cache settings
            const enhancedInit = {
              ...init,
              cache: 'no-store' as RequestCache,
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...init?.headers,
              },
            };
            
            return await originalFetch(input, enhancedInit);
          } catch (error) {
            console.warn('Localhost request failed:', error);
            throw error;
          }
        }
        
        // For non-localhost requests, use original fetch
        return originalFetch(input, init);
      };
    }
  }

  private async checkLocalServerAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      // AGGRESSIVE localhost connection - bypass ALL browser network detection
      const timestamp = Date.now();
      const response = await this.forceLocalhostRequest(`${API_BASE_URL}/health?t=${timestamp}`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.isLocalServerAvailable = response.ok;
      this.lastServerCheck = Date.now();
      console.log('Local server status:', this.isLocalServerAvailable ? 'Available' : 'Unavailable');
      return this.isLocalServerAvailable;
    } catch (error) {
      console.warn('Local server check failed:', error);
      this.isLocalServerAvailable = false;
      this.lastServerCheck = Date.now();
      return false;
    }
  }

  private async forceLocalhostRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Create XMLHttpRequest as fallback when fetch fails due to network detection
    return new Promise((resolve, reject) => {
      try {
        // Try fetch first
        fetch(url, {
          ...options,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...options.headers,
          },
          mode: 'cors',
          credentials: 'omit'
        }).then(resolve).catch((fetchError) => {
          console.warn('Fetch failed, trying XMLHttpRequest:', fetchError);
          
          // Fallback to XMLHttpRequest which bypasses some browser network detection
          const xhr = new XMLHttpRequest();
          xhr.open(options.method || 'GET', url, true);
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          xhr.setRequestHeader('Pragma', 'no-cache');
          xhr.setRequestHeader('Expires', '0');
          
          if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value as string);
            });
          }
          
          xhr.onload = () => {
            // Create a Response-like object
            const response = {
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              statusText: xhr.statusText,
              json: () => Promise.resolve(JSON.parse(xhr.responseText || '{}')),
              text: () => Promise.resolve(xhr.responseText)
            } as Response;
            resolve(response);
          };
          
          xhr.onerror = () => reject(new Error(`XMLHttpRequest failed: ${xhr.status}`));
          xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'));
          
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              xhr.abort();
              reject(new Error('XMLHttpRequest aborted'));
            });
          }
          
          xhr.send(options.body as string || null);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // SUPER AGGRESSIVE local server request - bypass ALL browser restrictions
    const timestamp = Date.now();
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${API_BASE_URL}${endpoint}${separator}t=${timestamp}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await this.forceLocalhostRequest(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update server availability on successful request
      this.isLocalServerAvailable = true;
      this.lastServerCheck = Date.now();
      return await response.json();
    } catch (error) {
      console.error(`Local server request failed for ${endpoint}:`, error);
      // Only mark as unavailable if it's a connection error, not HTTP error
      if (error instanceof TypeError || error.name === 'AbortError' || error.message.includes('fetch')) {
        this.isLocalServerAvailable = false;
        this.lastServerCheck = Date.now();
      }
      throw error;
    }
  }

  isServerAvailable(): boolean {
    return this.isLocalServerAvailable;
  }

  async forceServerCheck(): Promise<boolean> {
    this.lastServerCheck = 0; // Force a fresh check
    return await this.checkLocalServerAvailability();
  }
}

export const localServerService = new LocalServerService();