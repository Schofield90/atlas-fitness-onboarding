// Polyfills for SSR compatibility
if (typeof window === 'undefined') {
  // Polyfill self for server-side rendering
  global.self = global as any;
}

export {};