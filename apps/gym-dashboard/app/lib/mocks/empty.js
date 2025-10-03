// Mock module for server-side rendering
module.exports = {
  Position: {
    Left: 'left',
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
  },
  MarkerType: {
    Arrow: 'arrow',
    ArrowClosed: 'arrowclosed',
  },
  Handle: () => null,
  ReactFlowProvider: ({ children }) => children,
  addEdge: () => [],
  useNodesState: () => [[], () => {}, () => {}],
  useEdgesState: () => [[], () => {}, () => {}],
  useReactFlow: () => ({}),
  Controls: () => null,
  MiniMap: () => null,
  Background: () => null,
  BackgroundVariant: {},
  Panel: () => null,
  NodeToolbar: () => null,
};