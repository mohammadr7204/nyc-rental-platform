import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NYC Rental Platform - Direct Landlord to Tenant Rentals',
  description: 'Find your perfect NYC apartment without broker fees. Connect directly with landlords and property managers. FARE Act compliant platform.',
  keywords: 'NYC rentals, no broker fee, FARE Act, apartments, landlords, tenants, New York City',
  authors: [{ name: 'NYC Rental Platform' }],
  openGraph: {
    title: 'NYC Rental Platform - Direct Landlord to Tenant Rentals',
    description: 'Find your perfect NYC apartment without broker fees.',
    url: 'https://nyc-rental-platform.com',
    siteName: 'NYC Rental Platform',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'NYC Rental Platform'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NYC Rental Platform - Direct Landlord to Tenant Rentals',
    description: 'Find your perfect NYC apartment without broker fees.',
    images: ['/og-image.jpg']
  },
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}