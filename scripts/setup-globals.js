// Setup globals before Next.js build starts
// This runs before any other code via NODE_OPTIONS -r flag

// Polyfill self for SSR
if (typeof self === 'undefined') {
  global.self = global;
}

// Ensure globalThis is available
if (typeof globalThis === 'undefined') {
  global.globalThis = global;
}

// Also set it on the global object itself
global.global = global;

// Basic window polyfill for SSR
if (typeof window === 'undefined') {
  global.window = {
    document: {
      createElement: () => ({}),
      createTextNode: () => ({}),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    navigator: {
      userAgent: 'node',
    },
    location: {
      href: '',
      protocol: 'https:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    getComputedStyle: () => ({
      getPropertyValue: () => '',
    }),
  };
}

// Set process.browser for compatibility
if (typeof process !== 'undefined') {
  process.browser = false;
}

console.log('[setup-globals] Global polyfills loaded');