import config from '../config';

class DevModeDetector {
  constructor() {
    this.aiHandlerMode = 'unknown';
    this.lastCheck = null;
    this.checkInterval = 30000; // Check every 30 seconds
  }

  /**
   * Detect the current AI handler mode by making a test API call
   * This is a heuristic approach - in production you might want a dedicated endpoint
   */
  async detectAiHandlerMode() {
    try {
      // Only check if we haven't checked recently
      const now = Date.now();
      if (this.lastCheck && (now - this.lastCheck) < this.checkInterval) {
        return this.aiHandlerMode;
      }

      // For localhost, we can make some educated guesses
      if (window.location.hostname === 'localhost') {
        // Check if we're in development mode
        const isDev = process.env.NODE_ENV === 'development' || 
                      process.env.REACT_APP_TEST_MODE === 'true';
        
        if (isDev) {
          // Try to make a lightweight API call to see response patterns
          // This is a heuristic - you might want to add a dedicated endpoint
          try {
            const response = await fetch(`${config.API.REST.resumeOptimizer.endpoint}/status?jobId=test-dev-mode-check`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            // Check response headers or patterns that might indicate dev vs prod
            // This is a simple heuristic - you could add more sophisticated detection
            const responseText = await response.text();
            
            // Look for patterns that might indicate dev mode
            // (This is just an example - you'd need to implement actual detection logic)
            if (responseText.includes('dev') || response.headers.get('x-dev-mode')) {
              this.aiHandlerMode = 'dev';
            } else {
              this.aiHandlerMode = 'prod';
            }
          } catch (error) {
            // If API call fails, assume we're in dev mode for localhost
            this.aiHandlerMode = 'dev-assumed';
          }
        } else {
          this.aiHandlerMode = 'prod';
        }
      } else {
        // For deployed environments, assume production
        this.aiHandlerMode = 'prod';
      }

      this.lastCheck = now;
      return this.aiHandlerMode;
    } catch (error) {
      console.warn('Failed to detect AI handler mode:', error);
      this.aiHandlerMode = 'unknown';
      return this.aiHandlerMode;
    }
  }

  /**
   * Get current environment information
   */
  getEnvironmentInfo() {
    const apiEndpoint = config.API.REST.resumeOptimizer.endpoint;
    const analyticsEndpoint = config.Analytics.endpoint;
    
    return {
      frontend: window.location.hostname === 'localhost' ? 'LOCAL' : 'DEPLOYED',
      api: apiEndpoint.includes('/prod') ? 'PROD' : apiEndpoint.includes('/dev') ? 'DEV' : 'UNKNOWN',
      analytics: analyticsEndpoint.includes('/prod') ? 'PROD' : analyticsEndpoint.includes('/dev') ? 'DEV' : 'UNKNOWN',
      aiHandler: this.aiHandlerMode.toUpperCase(),
      isDevelopment: process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_TEST_MODE === 'true' ||
                     process.env.REACT_APP_ENVIRONMENT === 'dev'
    };
  }

  /**
   * Check if dev mode banner should be shown
   */
  shouldShowDevBanner() {
    const envInfo = this.getEnvironmentInfo();
    return envInfo.isDevelopment || envInfo.frontend === 'LOCAL';
  }
}

// Create singleton instance
const devModeDetector = new DevModeDetector();

export default devModeDetector;