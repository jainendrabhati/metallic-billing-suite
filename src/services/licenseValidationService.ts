// import { licenseAPI } from './licenseAPI';

// class LicenseValidationService {
//   private validationTimer: NodeJS.Timeout | null = null;
//   private lastValidationTime: number = 0;
//   private isOnline: boolean = navigator.onLine;
//   private pendingValidation: boolean = false;
//   private validationInterval: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

//   constructor() {
//     this.setupOnlineListener();
//     this.setupPeriodicValidation();
//   }

//   private setupOnlineListener() {
//     window.addEventListener('online', () => {
//       this.isOnline = true;
//       if (this.pendingValidation) {
//         this.performValidation();
//       }
//     });

//     window.addEventListener('offline', () => {
//       this.isOnline = false;
//     });
//   }

//   private setupPeriodicValidation() {
//     // Check if we need immediate validation
//     const lastValidation = localStorage.getItem('lastLicenseValidation');
//     const now = Date.now();
    
//     if (lastValidation) {
//       this.lastValidationTime = parseInt(lastValidation);
//       const timeSinceLastValidation = now - this.lastValidationTime;
      
//       if (timeSinceLastValidation >= this.validationInterval) {
//         // Need immediate validation
//         if (this.isOnline) {
//           this.performValidation();
//         } else {
//           this.pendingValidation = true;
//         }
//       } else {
//         // Schedule next validation
//         const timeUntilNextValidation = this.validationInterval - timeSinceLastValidation;
//         this.scheduleNextValidation(timeUntilNextValidation);
//       }
//     } else {
//       // First time setup, validate immediately
//       this.lastValidationTime = now;
//       localStorage.setItem('lastLicenseValidation', now.toString());
//       if (this.isOnline) {
//         this.performValidation();
//       } else {
//         this.pendingValidation = true;
//       }
//     }
//   }

//   private scheduleNextValidation(delay: number = this.validationInterval) {
//     if (this.validationTimer) {
//       clearTimeout(this.validationTimer);
//     }

//     this.validationTimer = setTimeout(() => {
//       if (this.isOnline) {
//         this.performValidation();
//       } else {
//         this.pendingValidation = true;
//       }
//     }, delay);
//   }

//   private async performValidation() {
//     try {
//       console.log('Performing 24-hour license validation...');
      
//       // Try Supabase validation first
//       try {
//         const response = await fetch('https://deemskrvkghcjlnyzpnw.supabase.co/functions/v1/validate-key', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             name: 'system_validation',
//             key: 'periodic_check'
//           }),
//           signal: AbortSignal.timeout(15000) // 15 second timeout
//         });

//         if (response.status === 200) {
//           // Supabase validation successful
//           await this.handleSuccessfulValidation();
//           return;
//         }
//       } catch (supabaseError) {
//         console.warn('Supabase validation failed, trying local validation:', supabaseError);
//       }

//       // Fallback to local validation
//       await licenseAPI.validateLicense();
//       await this.handleSuccessfulValidation();
      
//     } catch (error: any) {
//       console.error('License validation failed:', error);
      
//       // Check if it's a server error (500) or network error
//       if (error.message?.includes('500') || error.message?.includes('fetch') || error.message?.includes('network')) {
//         console.log('Server error or network issue, app continues normally');
//         // Schedule retry in 1 hour for server errors
//         this.scheduleNextValidation(60 * 60 * 1000);
//         return;
//       }
      
//       // If license is invalid or unauthorized, shutdown app
//       if (error.message === 'License validation failed' || error.message?.includes('401')) {
//         await this.handleInvalidLicense();
//       }
//     }
//   }

//   private async handleSuccessfulValidation() {
//     this.lastValidationTime = Date.now();
//     localStorage.setItem('lastLicenseValidation', this.lastValidationTime.toString());
//     this.pendingValidation = false;
    
//     // Schedule next validation in 24 hours
//     this.scheduleNextValidation();
    
//     console.log('License validation successful, next check in 24 hours');
//   }

//   private async handleInvalidLicense() {
//     console.error('License is invalid or not authorized, shutting down app...');
    
//     // Clear stored license
//     try {
//       await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api'}/license`, {
//         method: 'DELETE'
//       });
//     } catch (e) {
//       console.warn('Failed to clear license from backend:', e);
//     }
    
//     // Clear local storage
//     localStorage.removeItem('lastLicenseValidation');
    
//     // Show error message and reload app to show authentication dialog
//     alert('License validation failed. Your license key is no longer valid. The application will now restart and require re-authentication.');
    
//     // Force reload to trigger authentication dialog
//     window.location.reload();
//   }

//   public async forceValidation(): Promise<boolean> {
//     try {
//       await this.performValidation();
//       return true;
//     } catch (error) {
//       return false;
//     }
//   }

//   public destroy() {
//     if (this.validationTimer) {
//       clearTimeout(this.validationTimer);
//       this.validationTimer = null;
//     }
//     window.removeEventListener('online', this.setupOnlineListener);
//     window.removeEventListener('offline', this.setupOnlineListener);
//   }
// }

// export const licenseValidationService = new LicenseValidationService();