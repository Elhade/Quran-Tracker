import './globals.css';
import type { Metadata } from 'next';
import { Inter, Scheherazade_New } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const amiri = Scheherazade_New({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-amiri' });

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
      <body className={`${inter.variable} ${amiri.variable} font-sans bg-[#f5f3ef]`}>{children}</body>
    </html>
  );
}
