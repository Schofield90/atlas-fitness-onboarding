// Polyfills for SSR compatibility
if (typeof window === 'undefined') {
  // Ensure globalThis is available
  if (typeof globalThis === 'undefined') {
    (global as any).globalThis = global;
  }
  
  // Polyfill self for server-side rendering
  (global as any).self = global;
  
  // Polyfill window object basics for libraries that check for it
  (global as any).window = {
    document: {},
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
  };
}

export {};