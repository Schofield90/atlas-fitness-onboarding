// Development utilities for faster debugging and testing

/**
 * Console log with timestamp and color
 */
export function devLog(message: string, data?: any, color: 'info' | 'success' | 'error' | 'warn' = 'info') {
  if (process.env.NODE_ENV !== 'development') return;
  
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m'     // Yellow
  };
  
  const reset = '\x1b[0m';
  const timestamp = new Date().toLocaleTimeString();
  
  console.log(`${colors[color]}[${timestamp}] ${message}${reset}`);
  if (data) {
    console.log(data);
  }
}

/**
 * Performance timer utility
 */
export class PerfTimer {
  private startTime: number;
  private label: string;
  
  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
    devLog(`⏱️  ${label} started`, undefined, 'info');
  }
  
  end() {
    const duration = performance.now() - this.startTime;
    devLog(`⏱️  ${this.label} completed in ${duration.toFixed(2)}ms`, undefined, 'success');
    return duration;
  }
}

/**
 * Debug API response helper
 */
export async function debugApiResponse(response: Response, label: string = 'API Response') {
  if (process.env.NODE_ENV !== 'development') return response;
  
  const clonedResponse = response.clone();
  
  try {
    const data = await clonedResponse.json();
    devLog(`📡 ${label}`, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: data
    }, response.ok ? 'success' : 'error');
  } catch {
    devLog(`📡 ${label} (non-JSON)`, {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    }, response.ok ? 'success' : 'error');
  }
  
  return response;
}

/**
 * Quick test data generator
 */
export const testData = {
  lead: () => ({
    id: `test-${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '+447700900000',
    name: 'Test User',
    source: 'manual',
    status: 'new',
    created_at: new Date().toISOString()
  }),
  
  booking: () => ({
    id: `booking-${Date.now()}`,
    class_session_id: 'test-session',
    customer_id: 'test-customer',
    status: 'confirmed',
    created_at: new Date().toISOString()
  }),
  
  message: (type: 'email' | 'sms' | 'whatsapp' = 'email') => ({
    to_email: type === 'email' ? 'test@example.com' : '+447700900000',
    subject: type === 'email' ? 'Test Email' : undefined,
    body: `Test ${type} message sent at ${new Date().toLocaleTimeString()}`,
    status: 'sent',
    created_at: new Date().toISOString()
  })
};

/**
 * Environment variable checker
 */
export function checkEnvVars(required: string[]): { missing: string[], present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];
  
  required.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    devLog('⚠️  Missing environment variables:', missing, 'warn');
  }
  
  return { missing, present };
}

/**
 * Quick fetch wrapper with logging
 */
export async function devFetch(url: string, options?: RequestInit) {
  const timer = new PerfTimer(`Fetch ${url}`);
  
  try {
    const response = await fetch(url, options);
    timer.end();
    return debugApiResponse(response, `Fetch ${url}`);
  } catch (error) {
    timer.end();
    devLog(`Failed to fetch ${url}`, error, 'error');
    throw error;
  }
}

/**
 * Database query logger
 */
export function logQuery(tableName: string, operation: string, data?: any) {
  if (process.env.NODE_ENV !== 'development') return;
  
  devLog(`🗄️  DB: ${operation} on ${tableName}`, data, 'info');
}

/**
 * React component render tracker
 */
export function useRenderCount(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    devLog(`🔄 ${componentName} rendered ${renderCount.current} times`);
  });
}

// Make sure to import useRef and useEffect if using the hook
import { useRef, useEffect } from 'react';