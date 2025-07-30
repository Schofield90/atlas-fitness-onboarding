// Self polyfill for SSR
if (typeof self === 'undefined') {
  global.self = global;
}

module.exports = global.self || global;
module.exports.default = module.exports;