import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/app/lib/polyfills'
import { AnalyticsProvider } from '@/app/components/analytics/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gymleadhub - AI-Powered Gym Lead Management',
  description: 'Stop losing gym leads to competitors. Our AI system captures, qualifies, and nurtures leads 24/7.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  )
}