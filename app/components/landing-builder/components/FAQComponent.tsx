'use client'

import React, { useState } from 'react'
import { ComponentProps } from '../types'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps extends ComponentProps {
  title?: string
  items?: FAQItem[]
}

export const FAQComponent: React.FC<FAQProps> = ({
  title = 'Frequently Asked Questions',
  items = [
    { question: 'How does the builder work?', answer: 'Drag and drop components to build your page, then customize in the Properties panel.' },
    { question: 'Can I import an existing page?', answer: 'Yes, use the Import from URL option to generate a template from any website.' },
    { question: 'Is there a free trial?', answer: 'You can start for free and upgrade anytime.' }
  ],
  className = ''
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">{title}</h2>}
        <div className="max-w-3xl mx-auto divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
          {items.map((item, idx) => (
            <div key={idx}>
              <button
                className="w-full text-left px-4 py-3 font-medium flex justify-between items-center"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span>{item.question}</span>
                <span className="text-gray-400">{openIndex === idx ? '−' : '+'}</span>
              </button>
              {openIndex === idx && (
                <div className="px-4 pb-4 text-gray-700">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

