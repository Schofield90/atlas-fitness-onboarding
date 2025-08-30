'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DrawerTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface DrawerContentProps {
  children: React.ReactNode
  className?: string
  side?: 'left' | 'right'
  title?: string
}

const DrawerContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

function Drawer({ open, onOpenChange, children }: DrawerProps) {
  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <DrawerContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({ children, asChild }: DrawerTriggerProps) {
  const { onOpenChange, open } = React.useContext(DrawerContext)

  const handleClick = () => {
    onOpenChange(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      'aria-expanded': open,
    } as any)
  }

  return (
    <button
      onClick={handleClick}
      aria-expanded={open}
    >
      {children}
    </button>
  )
}

function DrawerContent({
  children,
  className,
  side = 'right',
  title,
}: DrawerContentProps) {
  const { open, onOpenChange } = React.useContext(DrawerContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Drawer */}
      <div
        ref={contentRef}
        className={cn(
          'fixed inset-y-0 bg-white shadow-xl transition-transform',
          side === 'left' 
            ? 'left-0 transform' + (open ? ' translate-x-0' : ' -translate-x-full')
            : 'right-0 transform' + (open ? ' translate-x-0' : ' translate-x-full'),
          'w-96 max-w-full',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              data-testid="drawer-close"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

interface DrawerItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  'data-testid'?: string
}

function DrawerItem({ 
  children, 
  onClick, 
  className,
  'data-testid': testId 
}: DrawerItemProps) {
  return (
    <button
      className={cn(
        'w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </button>
  )
}

export { Drawer, DrawerTrigger, DrawerContent, DrawerItem }