#!/usr/bin/env node

// Component Generator Script
// Usage: node scripts/create-component.js ComponentName

const fs = require('fs');
const path = require('path');

const componentName = process.argv[2];

if (!componentName) {
  console.error('❌ Please provide a component name');
  console.log('Usage: node scripts/create-component.js ComponentName');
  process.exit(1);
}

// Ensure PascalCase
const pascalCase = componentName.charAt(0).toUpperCase() + componentName.slice(1);

// Component template
const componentTemplate = `'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'

interface ${pascalCase}Props {
  className?: string
  children?: React.ReactNode
}

export default function ${pascalCase}({ className, children }: ${pascalCase}Props) {
  const [state, setState] = useState<string>('')

  return (
    <div className={cn('', className)}>
      {children || '${pascalCase} Component'}
    </div>
  )
}
`;

// Test template
const testTemplate = `import { render, screen } from '@testing-library/react'
import ${pascalCase} from './${pascalCase}'

describe('${pascalCase}', () => {
  it('renders correctly', () => {
    render(<${pascalCase} />)
    expect(screen.getByText('${pascalCase} Component')).toBeInTheDocument()
  })

  it('accepts className prop', () => {
    const { container } = render(<${pascalCase} className="test-class" />)
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('renders children', () => {
    render(<${pascalCase}>Test Content</${pascalCase}>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
`;

// Story template
const storyTemplate = `import type { Meta, StoryObj } from '@storybook/react'
import ${pascalCase} from './${pascalCase}'

const meta = {
  title: 'Components/${pascalCase}',
  component: ${pascalCase},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof ${pascalCase}>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithContent: Story = {
  args: {
    children: 'Custom content',
  },
}

export const WithClassName: Story = {
  args: {
    className: 'bg-gray-100 p-4 rounded',
    children: 'Styled component',
  },
}
`;

// Create component directory
const componentDir = path.join(process.cwd(), 'app/components', pascalCase);

if (fs.existsSync(componentDir)) {
  console.error(`❌ Component ${pascalCase} already exists`);
  process.exit(1);
}

try {
  // Create directory
  fs.mkdirSync(componentDir, { recursive: true });

  // Write files
  fs.writeFileSync(path.join(componentDir, `${pascalCase}.tsx`), componentTemplate);
  fs.writeFileSync(path.join(componentDir, `${pascalCase}.test.tsx`), testTemplate);
  fs.writeFileSync(path.join(componentDir, `${pascalCase}.stories.tsx`), storyTemplate);

  // Create index file for easier imports
  const indexContent = `export { default } from './${pascalCase}'
export * from './${pascalCase}'
`;
  fs.writeFileSync(path.join(componentDir, 'index.ts'), indexContent);

  console.log(`✅ Component ${pascalCase} created successfully!`);
  console.log(`📁 Location: app/components/${pascalCase}/`);
  console.log(`📄 Files created:`);
  console.log(`   - ${pascalCase}.tsx`);
  console.log(`   - ${pascalCase}.test.tsx`);
  console.log(`   - ${pascalCase}.stories.tsx`);
  console.log(`   - index.ts`);
} catch (error) {
  console.error('❌ Error creating component:', error.message);
  process.exit(1);
}