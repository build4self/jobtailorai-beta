/**
 * Session Management Utility for JobTailorAI
 * Handles remember me functionality and session persistence
 */

const SESSION_KEYS = {
  REMEMBER_ME: 'jobTailorAI_rememberMe',
  LAST_SIGN_IN: 'jobTailorAI_lastSignIn',
  USER_EMAIL: 'jobTailorAI_userEmail'
};

const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const sessionManager = {
  /**
   * Set remember me preference
   */
  setRememberMe: (email) => {
    localStorage.setItem(SESSION_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(SESSION_KEYS.LAST_SIGN_IN, Date.now().toString());
    localStorage.setItem(SESSION_KEYS.USER_EMAIL, email);
  },

  /**
   * Clear remember me preference
   */
  clearRememberMe: () => {
    localStorage.removeItem(SESSION_KEYS.REMEMBER_ME);
    localStorage.removeItem(SESSION_KEYS.LAST_SIGN_IN);
    localStorage.removeItem(SESSION_KEYS.USER_EMAIL);
  },

  /**
   * Check if remember me is active and valid
   */
  isRememberMeValid: () => {
    const rememberMe = localStorage.getItem(SESSION_KEYS.REMEMBER_ME);
    const lastSignIn = localStorage.getItem(SESSION_KEYS.LAST_SIGN_IN);
    
    if (!rememberMe || !lastSignIn) {
      return false;
    }
    
    const lastSignInTime = parseInt(lastSignIn);
    const now = Date.now();
    const timeDiff = now - lastSignInTime;
    
    // Check if within 30 days
    if (timeDiff > REMEMBER_ME_DURATION) {
      // Expired, clear the data
      sessionManager.clearRememberMe();
      return false;
    }
    
    return true;
  },

  /**
   * Get remembered user email
   */
  getRememberedEmail: () => {
    if (sessionManager.isRememberMeValid()) {
      return localStorage.getItem(SESSION_KEYS.USER_EMAIL);
    }
    return null;
  },

  /**
   * Update last sign in time (for extending session)
   */
  updateLastSignIn: () => {
    if (localStorage.getItem(SESSION_KEYS.REMEMBER_ME)) {
      localStorage.setItem(SESSION_KEYS.LAST_SIGN_IN, Date.now().toString());
    }
  },

  /**
   * Get days remaining for remember me session
   */
  getDaysRemaining: () => {
    const lastSignIn = localStorage.getItem(SESSION_KEYS.LAST_SIGN_IN);
    if (!lastSignIn) return 0;
    
    const lastSignInTime = parseInt(lastSignIn);
    const now = Date.now();
    const timeDiff = now - lastSignInTime;
    const daysRemaining = Math.max(0, Math.ceil((REMEMBER_ME_DURATION - timeDiff) / (24 * 60 * 60 * 1000)));
    
    return daysRemaining;
  }
};

export default sessionManager;
