import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geistSans = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Painel ClimaBrasil — Simulação preditiva de política climática',
  description:
    'Simule o impacto de ajustes em financiamento climático, governança e execução de políticas públicas nos quatro anos de mandato de estados e municípios brasileiros.',
  generator: 'v0.app',
  keywords: [
    'política climática',
    'simulação preditiva',
    'financiamento climático',
    'governança',
    'estados e municípios',
  ],
  openGraph: {
    title: 'Painel ClimaBrasil',
    description:
      'Simulação preditiva de política climática para estados e municípios brasileiros.',
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f6f2' },
    { media: '(prefers-color-scheme: dark)', color: '#101d21' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
