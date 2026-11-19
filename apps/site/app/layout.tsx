import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Labbench',
  description:
    'Hands-on coding labs on your own computer. Read a short lesson, write the code, press Check.'
}

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body className="font-sans text-sm">{children}</body>
    </html>
  )
}
