import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import AuthProvider from '@/components/layout/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const amiri = localFont({
  src: [
    { path: '../public/fonts/scheherazade-new-arabic-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/scheherazade-new-arabic-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-amiri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quran Tracker',
  description: 'Suivez votre lecture et memorisation du Coran',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quran Tracker',
  },
  themeColor: '#161412',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${amiri.variable} font-sans bg-[#f5f3ef]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
