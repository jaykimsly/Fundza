import "./globals.css";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: 'Fundza — Matric Study Companion',
  description:
    'Track your NSC marks, calculate your APS, and study smarter for university admission.',
  copyright: '© 2026 Fundza. All rights reserved.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          {children}
          <Footer />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
