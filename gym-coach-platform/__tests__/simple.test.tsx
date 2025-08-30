import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test to verify setup
describe('Test Setup Verification', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div data-testid="test">Hello World</div>
    
    render(<TestComponent />)
    
    expect(screen.getByTestId('test')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should handle mocked toast', () => {
    const { toast } = require('react-hot-toast')
    
    toast('test message')
    toast.success('success message')
    toast.error('error message')
    
    expect(toast).toHaveBeenCalledWith('test message')
    expect(toast.success).toHaveBeenCalledWith('success message')
    expect(toast.error).toHaveBeenCalledWith('error message')
  })
})