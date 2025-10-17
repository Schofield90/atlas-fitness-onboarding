// Global polyfill for server-side rendering
let globalObj;

if (typeof globalThis !== 'undefined') {
  globalObj = globalThis;
} else if (typeof window !== 'undefined') {
  globalObj = window;
} else if (typeof self !== 'undefined') {
  globalObj = self;
} else {
  // Use Node.js global in server environment
  globalObj = (function() { return this; })() || Function('return this')();
}

module.exports = globalObj;
module.exports.default = globalObj;