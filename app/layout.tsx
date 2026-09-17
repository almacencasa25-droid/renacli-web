import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.renacli.com.ar'),

  title:
    'RENACLI | Matrícula de Técnicos en Refrigeración y Climatización',

  description:
    'RENACLI es el Registro Nacional de Climatización y Refrigeración. Verificá matrículas de técnicos en refrigeración, aire acondicionado y climatización.',

  applicationName: 'RENACLI',

  alternates: {
    canonical: '/',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://www.renacli.com.ar/',
    siteName: 'RENACLI',
    title:
      'RENACLI | Matrícula de Técnicos en Refrigeración y Climatización',
    description:
      'Registro Nacional de Climatización y Refrigeración. Verificá el estado de matrícula de técnicos en refrigeración, aire acondicionado y climatización.',
  },

  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1b3a6b',
}

const datosEstructurados = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.renacli.com.ar/#organization',
      name: 'RENACLI',
      alternateName:
        'Registro Nacional de Climatización y Refrigeración',
      url: 'https://www.renacli.com.ar/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.renacli.com.ar/icon.png',
      },
      description:
        'Registro Nacional de Climatización y Refrigeración. Verificación de matrículas de técnicos en refrigeración, aire acondicionado y climatización.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.renacli.com.ar/#website',
      url: 'https://www.renacli.com.ar/',
      name: 'RENACLI',
      alternateName:
        'Registro Nacional de Climatización y Refrigeración',
      inLanguage: 'es-AR',
      publisher: {
        '@id': 'https://www.renacli.com.ar/#organization',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="light bg-background">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(datosEstructurados),
          }}
        />

        {children}

        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
