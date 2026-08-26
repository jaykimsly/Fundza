import "./globals.css";
import NetworkStatus from '@/components/NetworkStatus';
import AppNav from '@/components/AppNav';

export const metadata = {
  title: 'Fundza — Your Study Companion',
  description: 'A simple South African study companion for Grade 10 to Grade 12 learners.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f172a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NetworkStatus />
        {children}
        <AppNav />
      </body>
    </html>
  );
}
