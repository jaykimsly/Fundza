import Link from 'next/link';
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function PrivacyPage() {
  return (
    <main className="container" style={{ maxWidth: '850px' }}>
      <article className="card">
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
          Version {LEGAL_VERSION} • Effective {LEGAL_EFFECTIVE_DATE}
        </p>

        <h1>Fundza Privacy Notice</h1>

        <p>
          This Privacy Notice explains how Fundza collects, uses, stores and
          protects personal information when you use the service.
        </p>

        <h2>1. Responsible Processing</h2>
        <p>
          Fundza is committed to processing personal information responsibly
          and in accordance with applicable South African data-protection
          requirements, including the Protection of Personal Information Act
          4 of 2013 (POPIA), where applicable.
        </p>

        <h2>2. Information We May Collect</h2>
        <p>
          Depending on the features you use, Fundza may process information
          such as your name, email address, authentication information,
          school-related information, grade information, subjects,
          assessment information, study progress and information you submit
          through learning features.
        </p>

        <h2>3. Why We Process Information</h2>
        <p>
          Personal information may be processed to create and authenticate
          accounts, provide educational functionality, maintain learning
          progress, improve the service, maintain security, prevent abuse and
          comply with legal obligations.
        </p>

        <h2>4. Lawful Processing</h2>
        <p>
          Personal information will be processed only where there is an
          appropriate legal basis under applicable law, including where
          processing is necessary to provide a requested service, required by
          law, justified by a legitimate purpose, or based on valid consent
          where consent is required.
        </p>

        <h2>5. Learners and Children</h2>
        <p>
          Fundza recognises that learners may include persons under the age
          of 18. Where personal information relating to a child is processed,
          additional requirements and safeguards under applicable South
          African law may apply.
        </p>

        <p>
          Where required, Fundza may require appropriate consent or
          authorisation from a competent person or parent/legal guardian.
        </p>

        <h2>6. Third-Party Providers</h2>
        <p>
          Fundza may use service providers for authentication, hosting,
          databases, storage, communications, security and other technical
          functions. Such providers may process information on behalf of
          Fundza subject to applicable contractual and legal requirements.
        </p>

        <h2>7. Security</h2>
        <p>
          Reasonable technical and organisational safeguards are used to
          protect personal information against unauthorised access, loss,
          misuse, alteration or disclosure.
        </p>

        <p>
          No internet-based system can guarantee absolute security.
        </p>

        <h2>8. Retention</h2>
        <p>
          Personal information will not be retained for longer than is
          necessary for the purposes for which it was collected, unless
          retention is required or permitted by applicable law.
        </p>

        <h2>9. Your Rights</h2>
        <p>
          Subject to applicable law, you may have rights concerning access to,
          correction of, deletion of, objection to or limitation of certain
          processing of your personal information.
        </p>

        <h2>10. Accuracy</h2>
        <p>
          Users should provide accurate information and notify Fundza when
          relevant information needs to be corrected.
        </p>

        <h2>11. Changes to this Notice</h2>
        <p>
          This Privacy Notice may be updated when necessary. Material changes
          may require users to review and acknowledge a new version.
        </p>

        <h2>12. Complaints and Enquiries</h2>
        <p>
          Privacy enquiries should first be directed to the Fundza privacy or
          official contact channel. Where applicable, users may also have
          rights to lodge a complaint with the Information Regulator of South
          Africa.
        </p>

        <h2>13. South African Law</h2>
        <p>
          This Privacy Notice is intended to operate consistently with
          applicable South African law.
        </p>

        <hr />

        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Related documents:{' '}
          <Link href="/terms">Terms & Conditions</Link>{' '}
          ·{' '}
          <Link href="/copyright">Copyright Notice</Link>
        </p>
      </article>
    </main>
  );
}
