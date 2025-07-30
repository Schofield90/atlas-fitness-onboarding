// Mock module for server-side rendering
module.exports = {
  Position: {
    Left: 'left',
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
  },
  Handle: () => null,
  ReactFlowProvider: ({ children }) => children,
};