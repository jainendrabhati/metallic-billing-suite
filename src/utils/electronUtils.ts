// Electron-specific utilities to handle UI freezing issues

export const electronUtils = {
  /**
   * Forces a DOM refresh to prevent input freezing in Electron
   */
  refreshDOM: () => {
    if (window.electronAPI || window.electron) {
      // Force a repaint by temporarily hiding and showing the body
      const body = document.body;
      body.style.visibility = 'hidden';
      
      // Use requestAnimationFrame to ensure the hide takes effect
      requestAnimationFrame(() => {
        body.style.visibility = 'visible';
        
        // Additionally force focus refresh on all input elements
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach((input) => {
          if (input instanceof HTMLElement) {
            input.blur();
            setTimeout(() => {
              input.focus();
              input.blur();
            }, 0);
          }
        });
      });
    }
  },

  /**
   * Ensures proper event handling after deletion operations
   */
  restoreEventHandlers: () => {
    if (window.electronAPI || window.electron) {
      // Force re-registration of event listeners
      const event = new Event('DOMContentLoaded', {
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      
      // Refresh all form elements
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select, button');
        inputs.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.pointerEvents = 'none';
            setTimeout(() => {
              element.style.pointerEvents = 'auto';
            }, 10);
          }
        });
      });
    }
  },

  /**
   * Checks if running in Electron environment
   */
  isElectron: () => {
    return !!(window.electronAPI || window.electron || navigator.userAgent.toLowerCase().indexOf('electron') > -1);
  },

  /**
   * Combined function to handle post-deletion cleanup
   */
  handlePostDeletion: () => {
    if (electronUtils.isElectron()) {
      setTimeout(() => {
        electronUtils.refreshDOM();
        electronUtils.restoreEventHandlers();
      }, 100);
    }
  }
};

// Type declarations for Electron APIs
declare global {
  interface Window {
    electronAPI?: any;
    electron?: any;
  }
}