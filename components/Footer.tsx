import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="brand-mark brand-mark-small">F</div>
          <div>
            <strong>Fundza</strong>
            <span>Study smarter. Aim higher.</span>
          </div>
        </div>

        <div className="footer-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/copyright">Copyright</Link>
          <Link href="/legal">Legal</Link>
        </div>

        <div className="footer-copy">
          © 2026 Fundza. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
