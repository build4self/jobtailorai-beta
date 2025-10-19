/**
 * Simple Click Stream Analytics Service
 * Tracks button clicks with sessionId, userId, timestamp, and metadata
 */

import config from '../config';
import Logger from './logger';

class ClickAnalytics {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.userId = null;
    this.username = null;
    this.apiEndpoint = config.Analytics.endpoint;
    this.eventQueue = [];
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    Logger.log('Analytics initialized with sessionId:', this.sessionId);
  }

  /**
   * Generate or retrieve session ID from sessionStorage
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Set user ID after authentication
   */
  setUserId(userId) {
    this.userId = userId;
    Logger.log('Analytics userId set:', userId);
  }

  /**
   * Set username after authentication
   */
  setUsername(username) {
    this.username = username;
    Logger.log('Analytics username set:', username);
  }

  /**
   * Clear user ID and username on logout
   */
  clearUserId() {
    this.userId = null;
    this.username = null;
    Logger.log('Analytics userId and username cleared');
  }

  /**
   * Track a button click event
   * @param {string} buttonClicked - Standardized button identifier
   * @param {object} metadata - Optional metadata (format, fileSize, etc.)
   */
  track(buttonClicked, metadata = {}) {
    const event = {
      sessionId: this.sessionId,
      userId: this.userId,
      username: this.username,
      buttonClicked,
      metadata,
      timestamp: new Date().toISOString()
    };

    Logger.log('Analytics event:', event);
    Logger.log('Analytics username debug:', {
      username: this.username,
      userId: this.userId,
      usernameType: typeof this.username,
      usernameNull: this.username === null,
      usernameUndefined: this.username === undefined
    });

    if (this.isOnline) {
      this.sendEvent(event);
    } else {
      // Queue for later if offline
      this.eventQueue.push(event);
      this.saveQueueToStorage();
    }
  }

  /**
   * Track feedback events
   * @param {string} type - Feedback event type (shown, rating_submitted, detailed_submitted, dismissed)
   * @param {object} data - Feedback data (rating, categories, text, etc.)
   */
  trackFeedback(type, data = {}) {
    this.track(`feedback_${type}`, {
      ...data,
      feedback_session: this.sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Track general events (not necessarily button clicks)
   * @param {string} eventName - Event name
   * @param {object} metadata - Event metadata
   */
  trackEvent(eventName, metadata = {}) {
    // Debug logging for username tracking
    Logger.log('Analytics trackEvent called:', {
      eventName,
      userId: this.userId,
      username: this.username,
      hasMetadata: !!metadata
    });
    
    this.track(eventName, metadata);
  }

  /**
   * Send event to backend
   */
  async sendEvent(event) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      Logger.log('Analytics event sent successfully');
    } catch (error) {
      Logger.error('Failed to send analytics event:', error);
      
      // Add to queue for retry
      this.eventQueue.push(event);
      this.saveQueueToStorage();
    }
  }

  /**
   * Flush queued events when back online
   */
  async flushQueue() {
    if (this.eventQueue.length === 0) {
      return;
    }

    Logger.log(`Flushing ${this.eventQueue.length} queued analytics events`);

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToSend) {
      await this.sendEvent(event);
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.clearQueueFromStorage();
  }

  /**
   * Save queue to localStorage for persistence
   */
  saveQueueToStorage() {
    try {
      localStorage.setItem('analytics_queue', JSON.stringify(this.eventQueue));
    } catch (error) {
      Logger.error('Failed to save analytics queue to storage:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueueFromStorage() {
    try {
      const saved = localStorage.getItem('analytics_queue');
      if (saved) {
        this.eventQueue = JSON.parse(saved);
        Logger.log(`Loaded ${this.eventQueue.length} queued analytics events from storage`);
      }
    } catch (error) {
      Logger.error('Failed to load analytics queue from storage:', error);
      this.eventQueue = [];
    }
  }

  /**
   * Clear queue from localStorage
   */
  clearQueueFromStorage() {
    try {
      localStorage.removeItem('analytics_queue');
    } catch (error) {
      Logger.error('Failed to clear analytics queue from storage:', error);
    }
  }

  /**
   * Get current analytics state for debugging
   */
  getState() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      username: this.username,
      isOnline: this.isOnline,
      queueLength: this.eventQueue.length
    };
  }

  /**
   * Initialize analytics (call this on app start)
   */
  init() {
    this.loadQueueFromStorage();
    if (this.isOnline && this.eventQueue.length > 0) {
      this.flushQueue();
    }
  }
}

// Create singleton instance
const analytics = new ClickAnalytics();

export default analytics;