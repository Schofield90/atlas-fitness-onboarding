// Global polyfill for server-side rendering
const globalObj = (function() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  if (typeof self !== 'undefined') return self;
  throw new Error('Unable to locate global object');
})();

module.exports = globalObj;
module.exports.default = globalObj;