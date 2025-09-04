import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import VariableEditor from '@/app/components/automation/VariableEditor'

describe('VariableEditor', () => {
  it('renders help text and variable panel safely', () => {
    render(
      <VariableEditor
        value=""
        onChange={() => {}}
        showVariablePanel={true}
      />
    )

    expect(screen.getByText('Available Variables')).toBeInTheDocument()
    // Ensure literal braces are rendered without breaking JSX parsing
    expect(screen.getByText((content) => content.includes('{{'))).toBeInTheDocument()
  })
})

