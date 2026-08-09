import "./globals.css";

export const metadata = {
  title: 'Fundza — Matric Study Companion',
  description: 'Track your NSC marks, calculate your APS, and study smarter for university admission',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
