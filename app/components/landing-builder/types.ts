export interface ComponentProps {
  id?: string
  className?: string
  style?: React.CSSProperties
}

export type ComponentType = 
  | 'HEADER'
  | 'HERO' 
  | 'TEXT'
  | 'IMAGE'
  | 'BUTTON'
  | 'FORM'
  | 'FEATURES'
  | 'TESTIMONIAL'
  | 'VIDEO'
  | 'SPACER'
  | 'DIVIDER'
  | 'COLUMNS'
  | 'CTA'
  | 'FOOTER'

export interface Component {
  id: string
  type: ComponentType
  props: Record<string, any>
  children?: Component[]
}

export interface ComponentDefinition {
  type: ComponentType
  label: string
  icon?: string
  category: 'basic' | 'content' | 'forms' | 'media' | 'layout'
  defaultProps: Record<string, any>
  propertySchema?: PropertySchema[]
}

export interface PropertySchema {
  name: string
  label: string
  type: 'text' | 'number' | 'color' | 'select' | 'boolean' | 'array'
  options?: Array<{ value: string; label: string }>
  defaultValue?: any
}