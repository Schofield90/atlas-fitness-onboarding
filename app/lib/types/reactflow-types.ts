// ReactFlow type definitions to avoid importing from the library
// This prevents SSR issues while maintaining type safety

export interface Node<T = any> {
  id: string;
  type?: string;
  data: T;
  position: { x: number; y: number };
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sourcePosition?: 'top' | 'right' | 'bottom' | 'left';
  targetPosition?: 'top' | 'right' | 'bottom' | 'left';
  parentNode?: string;
  extent?: 'parent' | [[number, number], [number, number]];
  expandParent?: boolean;
  positionAbsolute?: { x: number; y: number };
  [key: string]: any;
}

export interface Edge<T = any> {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: T;
  style?: React.CSSProperties;
  className?: string;
  label?: string | React.ReactNode;
  labelStyle?: React.CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: React.CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  selected?: boolean;
  markerStart?: string;
  markerEnd?: string;
  [key: string]: any;
}

export interface Connection {
  source: string | null;
  target: string | null;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface NodeProps<T = any> {
  id: string;
  type: string;
  data: T;
  selected: boolean;
  isConnectable: boolean;
  xPos: number;
  yPos: number;
  dragging: boolean;
  zIndex: number;
  targetPosition?: 'top' | 'right' | 'bottom' | 'left';
  sourcePosition?: 'top' | 'right' | 'bottom' | 'left';
}