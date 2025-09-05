'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface ColumnItem { title?: string; content?: string }

interface ColumnsProps extends ComponentProps {
  columns?: 2 | 3 | 4
  items?: ColumnItem[]
}

export const ColumnsComponent: React.FC<ColumnsProps> = ({
  columns = 3,
  items = [
    { title: 'Column 1', content: 'Add your content' },
    { title: 'Column 2', content: 'Add your content' },
    { title: 'Column 3', content: 'Add your content' }
  ],
  className = ''
}) => {
  const columnClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }[columns]

  return (
    <section className={`py-8 ${className}`}>
      <div className="container mx-auto px-4">
        <div className={`grid gap-6 ${columnClass}`}>
          {items.slice(0, columns).map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              {item.title && <h3 className="text-lg font-semibold mb-2">{item.title}</h3>}
              {item.content && <p className="text-gray-600">{item.content}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

