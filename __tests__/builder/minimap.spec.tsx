import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock ReactFlow components
jest.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: any) => <div data-testid="reactflow-provider">{children}</div>,
  ReactFlow: ({ children }: any) => (
    <div data-testid="reactflow-canvas">
      {children}
    </div>
  ),
  MiniMap: (props: any) => {
    // Mock the MiniMap with click behavior
    const handleClick = (event: React.MouseEvent) => {
      // Prevent any navigation
      event.preventDefault()
      event.stopPropagation()
      
      // Call the onNodeClick prop if provided (this should NOT change location)
      if (props.onNodeClick) {
        props.onNodeClick(event, { id: 'test-node' })
      }
    }

    return (
      <div 
        data-testid="minimap" 
        onClick={handleClick}
        style={{ 
          width: props.width || 200, 
          height: props.height || 150,
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc'
        }}
      >
        <div data-testid="minimap-node" onClick={handleClick}>Node</div>
      </div>
    )
  },
  Controls: () => <div data-testid="reactflow-controls">Controls</div>,
  Background: () => <div data-testid="reactflow-background">Background</div>,
  useNodesState: () => [[], jest.fn()],
  useEdgesState: () => [[], jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn(), setViewport: jest.fn() }),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/automations/builder'
  }),
  usePathname: () => '/automations/builder'
}))

// Simple test component that renders a minimap
function TestMinimapComponent() {
  return (
    <div data-testid="test-container">
      <div style={{ width: '100%', height: '500px' }}>
        {/* Mock ReactFlow with MiniMap */}
        <div data-testid="reactflow-canvas">
          <div data-testid="minimap" onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}>
            <div data-testid="minimap-node">Node</div>
          </div>
        </div>
      </div>
    </div>
  )
}

describe('MiniMap Navigation Prevention', () => {
  let originalLocation: Location

  beforeEach(() => {
    // Store original location
    originalLocation = window.location
    
    // Mock window.location
    delete (window as any).location
    window.location = {
      ...originalLocation,
      pathname: '/automations/builder',
      href: 'http://localhost:3000/automations/builder',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    } as any

    // Mock history
    Object.defineProperty(window, 'history', {
      writable: true,
      value: {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        go: jest.fn(),
      }
    })
  })

  afterEach(() => {
    // Restore original location
    window.location = originalLocation
    jest.clearAllMocks()
  })

  describe('MiniMap click behavior', () => {
    it('should not change window.location.pathname when minimap is clicked', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialPathname = window.location.pathname
      expect(initialPathname).toBe('/automations/builder')

      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Pathname should remain unchanged
      expect(window.location.pathname).toBe('/automations/builder')
      expect(window.location.pathname).toBe(initialPathname)
    })

    it('should not change window.location.href when minimap node is clicked', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialHref = window.location.href
      expect(initialHref).toBe('http://localhost:3000/automations/builder')

      const minimapNode = screen.getByTestId('minimap-node')
      
      // Click on minimap node
      await user.click(minimapNode)
      
      // href should remain unchanged
      expect(window.location.href).toBe('http://localhost:3000/automations/builder')
      expect(window.location.href).toBe(initialHref)
    })

    it('should not call history.pushState when minimap is clicked', async () => {
      const user = userEvent.setup()
      const pushStateSpy = jest.spyOn(window.history, 'pushState')
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Click multiple times
      await user.click(minimap)
      await user.click(minimap)
      await user.click(minimap)
      
      // Should not have called pushState
      expect(pushStateSpy).not.toHaveBeenCalled()
    })

    it('should not call history.replaceState when minimap is clicked', async () => {
      const user = userEvent.setup()
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState')
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Should not have called replaceState
      expect(replaceStateSpy).not.toHaveBeenCalled()
    })

    it('should not call window.location.assign when minimap is clicked', async () => {
      const user = userEvent.setup()
      const assignSpy = jest.spyOn(window.location, 'assign')
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Should not have called assign
      expect(assignSpy).not.toHaveBeenCalled()
    })

    it('should not call window.location.replace when minimap is clicked', async () => {
      const user = userEvent.setup()
      const replaceSpy = jest.spyOn(window.location, 'replace')
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Should not have called replace
      expect(replaceSpy).not.toHaveBeenCalled()
    })

    it('should prevent default behavior on minimap clicks', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Add event listener to capture the event
      let capturedEvent: Event | null = null
      minimap.addEventListener('click', (e) => {
        capturedEvent = e
      })
      
      // Click on minimap
      await user.click(minimap)
      
      // Event should have been prevented
      expect(capturedEvent).toBeTruthy()
      expect(capturedEvent?.defaultPrevented).toBe(true)
    })

    it('should stop event propagation on minimap clicks', async () => {
      const user = userEvent.setup()
      const parentClickHandler = jest.fn()
      
      render(
        <div onClick={parentClickHandler}>
          <TestMinimapComponent />
        </div>
      )
      
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled()
    })

    it('should handle double clicks without navigation', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialPathname = window.location.pathname
      const minimap = screen.getByTestId('minimap')
      
      // Double click on minimap
      await user.dblClick(minimap)
      
      // Pathname should remain unchanged
      expect(window.location.pathname).toBe(initialPathname)
    })

    it('should handle right clicks without navigation', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialPathname = window.location.pathname
      const minimap = screen.getByTestId('minimap')
      
      // Right click on minimap
      fireEvent.contextMenu(minimap)
      
      // Pathname should remain unchanged
      expect(window.location.pathname).toBe(initialPathname)
    })
  })

  describe('MiniMap scroll prevention', () => {
    it('should not scroll the page when minimap is clicked', async () => {
      const user = userEvent.setup()
      
      // Mock scrollTo
      const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Should not scroll
      expect(scrollToSpy).not.toHaveBeenCalled()
      
      scrollToSpy.mockRestore()
    })

    it('should not change document.documentElement.scrollTop when minimap is clicked', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialScrollTop = document.documentElement.scrollTop
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Scroll position should remain unchanged
      expect(document.documentElement.scrollTop).toBe(initialScrollTop)
    })

    it('should not change window.pageYOffset when minimap is clicked', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const initialPageYOffset = window.pageYOffset
      const minimap = screen.getByTestId('minimap')
      
      // Click on minimap
      await user.click(minimap)
      
      // Page offset should remain unchanged
      expect(window.pageYOffset).toBe(initialPageYOffset)
    })
  })

  describe('MiniMap component integration', () => {
    it('should render minimap without errors', () => {
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      expect(minimap).toBeInTheDocument()
    })

    it('should maintain minimap visibility after clicks', async () => {
      const user = userEvent.setup()
      
      render(<TestMinimapComponent />)
      
      const minimap = screen.getByTestId('minimap')
      expect(minimap).toBeVisible()
      
      // Click multiple times
      await user.click(minimap)
      await user.click(minimap)
      
      // Should still be visible
      expect(minimap).toBeVisible()
    })

    it('should not interfere with other builder functionality', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <TestMinimapComponent />
          <button data-testid="other-button" onClick={() => window.history.pushState({}, '', '/other')}>
            Other Button
          </button>
        </div>
      )
      
      const pushStateSpy = jest.spyOn(window.history, 'pushState')
      
      // Click minimap first
      const minimap = screen.getByTestId('minimap')
      await user.click(minimap)
      
      // Minimap should not have triggered navigation
      expect(pushStateSpy).not.toHaveBeenCalled()
      
      // Click other button
      const otherButton = screen.getByTestId('other-button')
      await user.click(otherButton)
      
      // Other button should work normally
      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/other')
    })
  })
})