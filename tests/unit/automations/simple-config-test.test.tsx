/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test component to verify setup
const SimpleComponent = ({ title }: { title: string }) => (
  <div>
    <h1>{title}</h1>
    <p>Simple test component</p>
  </div>
)

describe('Simple Config Test - Setup Verification', () => {
  it('should render a basic component', () => {
    render(<SimpleComponent title="Test Title" />)
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Simple test component')).toBeInTheDocument()
  })

  it('should handle basic interactions', () => {
    const { rerender } = render(<SimpleComponent title="Initial" />)
    
    expect(screen.getByText('Initial')).toBeInTheDocument()
    
    rerender(<SimpleComponent title="Updated" />)
    
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.queryByText('Initial')).not.toBeInTheDocument()
  })
})