import { API_BASE_URL } from '../config';

class LocalhostBypass {
  private forceOnlineState = true;

  constructor() {
    this.initializeNetworkOverride();
  }

  private initializeNetworkOverride() {
    if (typeof window === 'undefined') return;

    // Override navigator.onLine permanently for our app
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Override all network event listeners
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'online' || type === 'offline') {
        // Ignore network events completely
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Force online state
    window.dispatchEvent(new Event('online'));
  }

  private createXMLRequest(url: string, options: RequestInit = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const method = options.method || 'GET';
      
      // Add timestamp to prevent any caching
      const separator = url.includes('?') ? '&' : '?';
      const timestampedUrl = `${url}${separator}_t=${Date.now()}&_r=${Math.random()}`;
      
      xhr.open(method, timestampedUrl, true);
      
      // Set aggressive anti-cache headers
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.setRequestHeader('Expires', '0');
      xhr.setRequestHeader('If-Modified-Since', 'Mon, 26 Jul 1997 05:00:00 GMT');
      
      // Set content type for JSON
      if (method !== 'GET') {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      
      // Add custom headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }

      xhr.timeout = 10000; // 10 second timeout
      
      xhr.onload = function() {
        try {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            json: () => {
              try {
                return Promise.resolve(JSON.parse(xhr.responseText || '{}'));
              } catch {
                return Promise.resolve({});
              }
            },
            text: () => Promise.resolve(xhr.responseText)
          };
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      xhr.onerror = function() {
        reject(new Error(`Request failed: ${xhr.status} ${xhr.statusText}`));
      };

      xhr.ontimeout = function() {
        reject(new Error('Request timeout'));
      };

      // Send the request
      try {
        xhr.send(options.body as string || null);
      } catch (error) {
        reject(error);
      }
    });
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      // Always use XMLHttpRequest for localhost to bypass browser network detection
      const response = await this.createXMLRequest(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Fix logo URLs in settings responses
      if (endpoint === '/settings' && data.firm_logo_url) {
        if (data.firm_logo_url.includes('localhost:8080')) {
          data.firm_logo_url = data.firm_logo_url.replace('localhost:8080', 'localhost:5000');
        } else if (!data.firm_logo_url.startsWith('http')) {
          data.firm_logo_url = `http://localhost:5000/${data.firm_logo_url}`;
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Localhost request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.createXMLRequest(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const localhostBypass = new LocalhostBypass();