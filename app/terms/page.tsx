import Link from 'next/link';
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function TermsPage() {
  return (
    <main className="container" style={{ maxWidth: '850px' }}>
      <article className="card">
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
          Version {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <h1>Fundza Terms & Conditions</h1>

        <p>These Terms & Conditions govern your access to and use of Fundza, including its study resources, learning tools, quizzes, progress features and related services.</p>

        <h2>1. Acceptance of these Terms</h2>
        <p>By creating an account or using Fundza after being presented with these Terms, you confirm that you have read, understood and agree to be bound by them.</p>
        <p>If you do not agree to these Terms, you must not create or continue using a Fundza account.</p>

        <h2>2. Eligibility and Student Accounts</h2>
        <p>Fundza is intended to provide educational support to learners. You must provide information that is accurate and not misleading.</p>
        <p>Where a learner is a minor, Fundza may require appropriate involvement, authorisation or consent from a parent or legal guardian where required by applicable South African law.</p>

        <h2>3. Educational Information</h2>
        <p>Fundza provides educational resources and study assistance. It does not guarantee examination results, admission to an educational institution, academic performance or any particular outcome.</p>
        <p>Users remain responsible for verifying important academic, examination, admission and institutional requirements with the relevant educational authority or institution.</p>

        <h2>4. Acceptable Use</h2>
        <p>You must not use Fundza unlawfully, attempt to gain unauthorised access to its systems, interfere with its operation, abuse its services, submit malicious material, or use another person&apos;s account without permission.</p>

        <h2>5. Accounts and Security</h2>
        <p>You are responsible for maintaining the security of your account and for notifying Fundza if you believe that your account has been accessed without authorisation.</p>

        <h2>6. Intellectual Property</h2>
        <p>Unless expressly stated otherwise, Fundza&apos;s software, branding, interface, original content and other protected materials remain the property of their respective rights holders.</p>
        <p>You may use Fundza for its intended educational purpose but may not reproduce, redistribute, commercially exploit or modify protected materials without appropriate permission.</p>

        <h2>7. Third-Party Services</h2>
        <p>Fundza may rely on third-party services for authentication, infrastructure, storage, analytics or other functionality. Their services may be governed by their own terms and privacy policies.</p>

        <h2>8. Availability</h2>
        <p>We aim to keep Fundza available and reliable, but uninterrupted availability cannot be guaranteed. Maintenance, technical failures, security incidents and circumstances outside our reasonable control may affect availability.</p>

        <h2>9. Changes to the Service</h2>
        <p>Fundza may modify, suspend or discontinue features where reasonably necessary. Material changes to these Terms may require users to review and accept a new version before continuing to use affected services.</p>

        <h2>10. Privacy</h2>
        <p>Personal information is handled in accordance with the Fundza Privacy Notice and applicable South African data-protection law.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the extent permitted by applicable law, Fundza will not be responsible for losses arising from circumstances outside its reasonable control or from reliance on educational information without appropriate independent verification.</p>
        <p>Nothing in these Terms excludes or limits a right or liability that cannot lawfully be excluded or limited under South African law.</p>

        <h2>12. Termination</h2>
        <p>Access may be suspended or terminated where reasonably necessary, including for serious misuse, security concerns, unlawful activity or material breach of these Terms.</p>

        <h2>13. South African Law</h2>
        <p>These Terms are governed by the laws of the Republic of South Africa, subject to any mandatory rights and protections applicable to the user.</p>

        <h2>14. Contact</h2>
        <p>Questions regarding these Terms should be directed through the official Fundza contact channel.</p>

        <hr />
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Related documents:{' '}
          <Link href="/privacy">Privacy Notice</Link>{' '}
          ·{' '}
          <Link href="/copyright">Copyright Notice</Link>
        </p>
      </article>
    </main>
  );
}
