'use client';

import { v4 as uuidv4 } from 'uuid';
import type { AnalyticsEvent } from './types';

class AnalyticsClient {
  private static instance: AnalyticsClient;
  private queue: AnalyticsEvent[] = [];
  private visitorId: string;
  private sessionId: string;
  private lastActivity: number;
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_INTERVAL = 5000; // 5 seconds
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly ENDPOINT = '/api/analytics/track';
  private readonly STORAGE_KEY = '_analytics_queue';

  private constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.createSessionId();
    this.lastActivity = Date.now();
    this.loadQueueFromStorage();
    this.initializeTracking();
  }

  static getInstance(): AnalyticsClient {
    if (!AnalyticsClient.instance) {
      AnalyticsClient.instance = new AnalyticsClient();
    }
    return AnalyticsClient.instance;
  }

  private getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return 'server';
    
    const stored = localStorage.getItem('_analytics_vid');
    if (stored) return stored;
    
    const newId = uuidv4();
    localStorage.setItem('_analytics_vid', newId);
    return newId;
  }

  private createSessionId(): string {
    return uuidv4();
  }

  private checkSession(): void {
    const now = Date.now();
    if (now - this.lastActivity > this.SESSION_TIMEOUT) {
      this.sessionId = this.createSessionId();
    }
    this.lastActivity = now;
  }

  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        device: 'Server',
        browser: 'Server',
        os: 'Server',
        screenResolution: '0x0',
        viewport: '0x0'
      };
    }

    const ua = navigator.userAgent;
    const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const tablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    
    return {
      device: tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop',
      browser: this.getBrowser(ua),
      os: this.getOS(ua),
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  private getBrowser(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getOS(ua: string): string {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  }

  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to load analytics queue from storage:', error);
    }
  }

  private saveQueueToStorage(): void {
    if (typeof window === 'undefined' || this.queue.length === 0) return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save analytics queue to storage:', error);
    }
  }

  private initializeTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackPageView();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveQueueToStorage();
        this.flush(); // Send pending events when user leaves
      }
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const trackable = target.closest('[data-track]');
      if (trackable) {
        const trackData = trackable.getAttribute('data-track');
        this.trackClick(trackData || 'unknown');
      }
    });

    // Track scroll depth
    let maxScroll = 0;
    let scrollTimer: NodeJS.Timeout | null = null;
    
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          if (maxScroll >= 25 && maxScroll < 50) {
            this.trackCustomEvent('scroll_depth', { depth: '25%' });
          } else if (maxScroll >= 50 && maxScroll < 75) {
            this.trackCustomEvent('scroll_depth', { depth: '50%' });
          } else if (maxScroll >= 75 && maxScroll < 100) {
            this.trackCustomEvent('scroll_depth', { depth: '75%' });
          } else if (maxScroll === 100) {
            this.trackCustomEvent('scroll_depth', { depth: '100%' });
          }
        }, 1000);
      }
    });

    // Use Beacon API for unload events
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Set up batching
    this.scheduleBatch();
  }

  private scheduleBatch(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    
    this.batchTimer = setTimeout(() => {
      this.flush();
      this.scheduleBatch();
    }, this.BATCH_INTERVAL);
  }

  private async flush(useBeacon = false): Promise<void> {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ events })], {
        type: 'application/json'
      });
      navigator.sendBeacon(this.ENDPOINT, blob);
    } else {
      try {
        await fetch(this.ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });
      } catch (error) {
        // Re-queue events on failure
        this.queue.unshift(...events);
        console.error('Analytics flush failed:', error);
      }
    }
  }

  private track(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): void {
    this.checkSession();
    
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };

    this.queue.push(fullEvent);

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  // Public methods
  trackPageView(customPath?: string): void {
    if (typeof window === 'undefined') return;

    const deviceInfo = this.getDeviceInfo();
    
    this.track({
      type: 'pageview',
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      path: customPath || window.location.pathname,
      referrer: document.referrer,
      ...deviceInfo,
      metadata: {
        title: document.title,
        queryParams: Object.fromEntries(new URLSearchParams(window.location.search))
      }
    });
  }

  trackClick(target: string, metadata?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const deviceInfo = this.getDeviceInfo();
    
    this.track({
      type: 'click',
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      path: window.location.pathname,
      referrer: document.referrer,
      ...deviceInfo,
      metadata: {
        target,
        ...metadata
      }
    });
  }

  trackFormSubmit(formName: string, metadata?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const deviceInfo = this.getDeviceInfo();
    
    this.track({
      type: 'form_submit',
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      path: window.location.pathname,
      referrer: document.referrer,
      ...deviceInfo,
      metadata: {
        formName,
        ...metadata
      }
    });
  }

  trackCustomEvent(eventName: string, metadata?: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const deviceInfo = this.getDeviceInfo();
    
    this.track({
      type: 'custom',
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      path: window.location.pathname,
      referrer: document.referrer,
      ...deviceInfo,
      metadata: {
        eventName,
        ...metadata
      }
    });
  }
}

// Export singleton instance
export const analytics = AnalyticsClient.getInstance();