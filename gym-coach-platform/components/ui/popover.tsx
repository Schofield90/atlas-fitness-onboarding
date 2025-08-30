'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface PopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const PopoverContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement>
}>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
})

function Popover({ open, onOpenChange, children }: PopoverProps) {
  const triggerRef = React.useRef<HTMLElement>(null)

  return (
    <PopoverContext.Provider value={{ open, onOpenChange, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const { onOpenChange, open, triggerRef } = React.useContext(PopoverContext)

  const handleClick = () => {
    onOpenChange(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': open,
      'aria-haspopup': true,
    } as any)
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="true"
    >
      {children}
    </button>
  )
}

function PopoverContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
}: PopoverContentProps) {
  const { open, onOpenChange, triggerRef } = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      
      let top = 0
      let left = 0

      if (side === 'bottom') {
        top = triggerRect.bottom + window.scrollY + 4
      } else if (side === 'top') {
        top = triggerRect.top + window.scrollY - contentRect.height - 4
      }

      if (align === 'start') {
        left = triggerRect.left + window.scrollX
      } else if (align === 'end') {
        left = triggerRect.right + window.scrollX - contentRect.width
      } else {
        left = triggerRect.left + window.scrollX + (triggerRect.width / 2) - (contentRect.width / 2)
      }

      setPosition({ top, left })
    }
  }, [open, align, side])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        triggerRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'fixed z-50 min-w-32 rounded-md border border-gray-200 bg-white p-1 shadow-lg',
        className
      )}
      style={{ top: position.top, left: position.left }}
      role="menu"
    >
      {children}
    </div>,
    document.body
  )
}

interface PopoverItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

function PopoverItem({ 
  children, 
  onClick, 
  disabled, 
  className,
  'data-testid': testId 
}: PopoverItemProps) {
  return (
    <button
      className={cn(
        'flex w-full items-center rounded px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      role="menuitem"
    >
      {children}
    </button>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverItem }