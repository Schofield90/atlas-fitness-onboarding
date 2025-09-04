import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Import from workspace root via alias mapping in jest.config
import CreateClassTypeModal from '../../../../../app/classes/CreateClassTypeModal'

describe('CreateClassTypeModal', () => {
  it('closes when clicking X button', () => {
    const onClose = jest.fn()
    const onSuccess = jest.fn()

    render(<CreateClassTypeModal onClose={onClose} onSuccess={onSuccess} />)

    // Ensure modal is present
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Click the X button
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when pressing Escape key', () => {
    const onClose = jest.fn()
    const onSuccess = jest.fn()

    render(<CreateClassTypeModal onClose={onClose} onSuccess={onSuccess} />)

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('closes when clicking backdrop', () => {
    const onClose = jest.fn()
    const onSuccess = jest.fn()

    render(<CreateClassTypeModal onClose={onClose} onSuccess={onSuccess} />)

    // Click on overlay (backdrop)
    const overlay = screen.getByTestId('modal-overlay')
    fireEvent.click(overlay)

    expect(onClose).toHaveBeenCalled()
  })
})

