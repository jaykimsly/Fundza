import "../styles/globals.css";
import "../styles/responsive.css";
import "../styles/design-system.css";
import "../styles/shell.css";
import "../styles/dashboard.css";
import "../styles/landing.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: 'Fundza — Study smarter. Aim higher.',
  description: 'Fundza is a study companion for South African learners.',
  copyright: '© 2026 Fundza. All rights reserved.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
