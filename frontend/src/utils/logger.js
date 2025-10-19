/**
 * Logger utility for conditional console logging
 * Only logs in development mode or when explicitly enabled
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isTestMode = process.env.REACT_APP_TEST_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENVIRONMENT === 'production';

// Check if we're running on localhost (development server)
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname.includes('localhost'));

// Check if we're on a production domain (customize this for your domain)
const isProductionDomain = typeof window !== 'undefined' && 
  (window.location.hostname.includes('amazonaws.com') ||
   window.location.hostname.includes('cloudfront.net') ||
   window.location.hostname.includes('amplifyapp.com') ||
   // Add your custom production domain here
   window.location.hostname === 'your-production-domain.com');

// Enable logging ONLY in development (localhost) and NOT in production
const shouldLog = isLocalhost && !isProduction && !isProductionDomain;

class Logger {
  static log(...args) {
    if (shouldLog) {
      console.log(...args);
    }
  }

  static error(...args) {
    if (shouldLog) {
      console.error(...args);
    }
  }

  static warn(...args) {
    if (shouldLog) {
      console.warn(...args);
    }
  }

  static info(...args) {
    if (shouldLog) {
      console.info(...args);
    }
  }

  static debug(...args) {
    if (shouldLog) {
      console.debug(...args);
    }
  }

  // Force log - always logs regardless of environment (use sparingly)
  static forceLog(...args) {
    console.log(...args);
  }

  // Force error - always logs errors regardless of environment
  static forceError(...args) {
    console.error(...args);
  }

  // Debug method to check environment detection
  static checkEnvironment() {
    console.log('Logger Environment Check:', {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT,
      REACT_APP_TEST_MODE: process.env.REACT_APP_TEST_MODE,
      isDevelopment,
      isProduction,
      isLocalhost,
      isProductionDomain: typeof window !== 'undefined' && 
        (window.location.hostname.includes('amazonaws.com') ||
         window.location.hostname.includes('cloudfront.net') ||
         window.location.hostname.includes('amplifyapp.com')),
      shouldLog,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server-side'
    });
  }
}

export default Logger;
