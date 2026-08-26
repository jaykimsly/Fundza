import Link from 'next/link';
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function CopyrightPage() {
  return (
    <main className="container" style={{ maxWidth: '850px' }}>
      <article className="card">
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
          Version {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <h1>Fundza Copyright Notice</h1>

        <p>
          © 2026 Fundza. All rights reserved, subject to the rights of third
          parties and applicable South African copyright law.
        </p>

        <h2>1. Fundza Materials</h2>
        <p>
          Unless otherwise indicated, original software, branding, design
          elements, text, graphics and other materials created for Fundza are
          protected by applicable intellectual-property laws.
        </p>

        <h2>2. Third-Party Materials</h2>
        <p>
          Some educational information, trademarks, references or other
          materials may belong to third parties. Nothing on Fundza should be
          interpreted as transferring ownership of third-party intellectual
          property.
        </p>

        <h2>3. Permitted Educational Use</h2>
        <p>
          Users may access and use Fundza materials for their intended
          personal educational purposes, subject to these Terms & Conditions
          and applicable law.
        </p>

        <h2>4. Prohibited Use</h2>
        <p>
          You may not reproduce, redistribute, publish, sell, commercially
          exploit, scrape or otherwise use protected Fundza materials beyond
          what is permitted by law or expressly authorised by Fundza.
        </p>

        <h2>5. Copyright Complaints</h2>
        <p>
          If you believe material available through Fundza infringes your
          copyright, provide sufficient information to identify the material,
          explain the basis of the complaint and provide appropriate contact
          information through the official Fundza contact channel.
        </p>

        <h2>6. No Transfer of Rights</h2>
        <p>
          Access to Fundza does not transfer ownership of Fundza's
          intellectual property to the user.
        </p>

        <h2>7. Governing Law</h2>
        <p>
          Intellectual-property rights are governed by applicable law,
          including the laws of the Republic of South Africa.
        </p>

        <hr />

        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Related documents:{' '}
          <Link href="/terms">Terms & Conditions</Link>{' '}
          ·{' '}
          <Link href="/privacy">Privacy Notice</Link>
        </p>
      </article>
    </main>
  );
}
