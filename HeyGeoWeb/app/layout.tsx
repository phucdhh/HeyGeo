import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import I18nProvider from './i18n-provider';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: {
    default: 'HeyGeo – Dynamic Geometry Platform',
    template: '%s | HeyGeo',
  },
  description:
    'Nền tảng chia sẻ và khám phá mô hình hình học động. Tải lên, xem và chia sẻ các mô hình 2D & 3D được tạo bằng HeyGeo.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn'),
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'HeyGeo',
    title: 'HeyGeo – Dynamic Geometry Platform',
    description:
      'Nền tảng chia sẻ và khám phá mô hình hình học động. Tải lên, xem và chia sẻ các mô hình 2D & 3D được tạo bằng HeyGeo.',
    url: process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'HeyGeo Logo' }],
  },
  twitter: {
    card: 'summary',
    title: 'HeyGeo – Dynamic Geometry Platform',
    description:
      'Nền tảng chia sẻ và khám phá mô hình hình học động. Tải lên, xem và chia sẻ các mô hình 2D & 3D được tạo bằng HeyGeo.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`} suppressHydrationWarning>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
