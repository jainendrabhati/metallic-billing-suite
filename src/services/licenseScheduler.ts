import { licenseAPI } from './licenseAPI';

class LicenseScheduler {
  private validationTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly VALIDATION_INTERVAL = 120 * 60 * 1000; // 2 hours in milliseconds

  constructor() {
    this.start();
  }

  public start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('License scheduler started - validation every hour');
    
    // Schedule first validation after 1 hour
    this.scheduleValidation();
  }

  public stop() {
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
      this.validationTimer = null;
    }
    this.isRunning = false;
    console.log('License scheduler stopped');
  }

  public restart() {
    this.stop();
    this.start();
  }

  private scheduleValidation() {
    if (this.validationTimer) {
      clearTimeout(this.validationTimer);
    }

    this.validationTimer = setTimeout(async () => {
      await this.performValidation();
      // Schedule next validation
      this.scheduleValidation();
    }, this.VALIDATION_INTERVAL);
  }

  private async performValidation() {
    try {
      console.log('Performing hourly license validation...');
      await licenseAPI.validateLicense();
      console.log('License validation successful');
    } catch (error: any) {
      console.error('License validation failed:', error);
      
      // Handle validation failure
      if (error.message === 'License validation failed') {
        console.error('License is invalid, stopping scheduler');
        this.stop();
        // Optionally trigger re-authentication
        window.location.reload();
      }
    }
  }

  public async forceValidation(): Promise<boolean> {
    try {
      await this.performValidation();
      return true;
    } catch (error) {
      console.error('Force validation failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const licenseScheduler = new LicenseScheduler();