/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock react-dnd and backend to avoid ESM parsing issues in Jest
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{}, jest.fn()],
}))
jest.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }))

import LandingPageBuilderPage from '@/app/(dashboard)/landing-pages/builder/page'

describe('Landing Pages - Save Flow', () => {
  const originalPrompt = window.prompt
  const originalFetch = global.fetch
  const originalAlert = window.alert

  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
    ;(global.fetch as any) = jest.fn(async () =>
      new Response(JSON.stringify({ data: { id: 'new-page-123' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  })

  afterEach(() => {
    window.prompt = originalPrompt
    global.fetch = originalFetch as any
    window.alert = originalAlert
  })

  it('aborts immediately if user cancels the first prompt (name)', async () => {
    window.prompt = jest.fn().mockReturnValueOnce(null)

    render(<LandingPageBuilderPage />)

    // Enter builder flow
    fireEvent.click(screen.getByText('Start from Scratch'))

    // Click Save in the toolbar
    const saveButtons = await screen.findAllByText('Save')
    fireEvent.click(saveButtons[0])

    // Should not call second prompt nor fetch
    expect(window.prompt).toHaveBeenCalledTimes(1)
    expect(global.fetch).not.toHaveBeenCalled()

    // No "Saving..." indicator should appear
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
  })

  it('aborts without saving if user cancels the description prompt', async () => {
    window.prompt = jest
      .fn()
      .mockReturnValueOnce('My Page')
      .mockReturnValueOnce(null)

    render(<LandingPageBuilderPage />)

    fireEvent.click(screen.getByText('Start from Scratch'))

    const saveButtons = await screen.findAllByText('Save')
    fireEvent.click(saveButtons[0])

    // Two prompts shown, then aborted, no fetch
    expect(window.prompt).toHaveBeenCalledTimes(2)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
  })

  it('proceeds to save when user confirms both prompts', async () => {
    window.prompt = jest
      .fn()
      .mockReturnValueOnce('Launch Page')
      .mockReturnValueOnce('Great description')

    render(<LandingPageBuilderPage />)

    fireEvent.click(screen.getByText('Start from Scratch'))

    const saveButtons = await screen.findAllByText('Save')
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    // Ensure correct payload
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
    expect(fetchCall[0]).toBe('/api/landing-pages')
    const body = JSON.parse(fetchCall[1].body)
    expect(body.name).toBe('Launch Page')
    expect(body.description).toBe('Great description')

    // Success alert triggered
    expect(window.alert).toHaveBeenCalled()
  })
})

