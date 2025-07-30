'use client'

import dynamic from 'next/dynamic'
import type {
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
  NodeProps,
} from 'reactflow'

// Dynamic import ReactFlow with SSR disabled
const ReactFlowComponent = dynamic(
  () => import('reactflow').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">Loading workflow builder...</div>
  }
)

// Export other ReactFlow components dynamically
export const ReactFlowProvider = dynamic(
  () => import('reactflow').then(mod => mod.ReactFlowProvider),
  { ssr: false }
)

export const Controls = dynamic(
  () => import('reactflow').then(mod => mod.Controls),
  { ssr: false }
)

export const MiniMap = dynamic(
  () => import('reactflow').then(mod => mod.MiniMap),
  { ssr: false }
)

export const Background = dynamic(
  () => import('reactflow').then(mod => mod.Background),
  { ssr: false }
)

export const Panel = dynamic(
  () => import('reactflow').then(mod => mod.Panel),
  { ssr: false }
)

export const NodeToolbar = dynamic(
  () => import('reactflow').then(mod => mod.NodeToolbar),
  { ssr: false }
)

// For components that need to be used in node definitions
export const Handle = dynamic<any>(
  () => import('reactflow').then(mod => ({ default: mod.Handle })),
  { ssr: false }
)

// Re-export types (safe for SSR)
export type {
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
  NodeProps,
}

// Export hooks and utilities as functions that return defaults during SSR
export const addEdge = typeof window !== 'undefined' 
  ? require('reactflow').addEdge 
  : () => []

export const useNodesState = typeof window !== 'undefined'
  ? require('reactflow').useNodesState
  : () => [[], () => {}, () => {}]

export const useEdgesState = typeof window !== 'undefined'
  ? require('reactflow').useEdgesState
  : () => [[], () => {}, () => {}]

export const useReactFlow = typeof window !== 'undefined'
  ? require('reactflow').useReactFlow
  : () => ({})

export const applyNodeChanges = typeof window !== 'undefined'
  ? require('reactflow').applyNodeChanges
  : () => []

export const applyEdgeChanges = typeof window !== 'undefined'
  ? require('reactflow').applyEdgeChanges
  : () => []

// Export enums with defaults
export const MarkerType = typeof window !== 'undefined'
  ? require('reactflow').MarkerType
  : { Arrow: 'arrow', ArrowClosed: 'arrowclosed' }

export const BackgroundVariant = typeof window !== 'undefined'
  ? require('reactflow').BackgroundVariant
  : { Dots: 'dots', Lines: 'lines' }

export const Position = typeof window !== 'undefined'
  ? require('reactflow').Position
  : { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' }

export default ReactFlowComponent