import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Business Associate Agreement (BAA) | Wellness Projection Lab',
  description:
    'Review the Wellness Projection Lab Business Associate Agreement — the HIPAA contract that governs how WPL handles Protected Health Information on behalf of franchise partners and covered entities.',
  path: '/baa',
  keywords: 'business associate agreement, BAA HIPAA, covered entity contract, PHI handling agreement, HIPAA business associate',
})

export default function BAAPage() {
  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/franchise" className="text-sm text-primary hover:underline mb-6 block">&larr; Back to Franchise Application</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Business Associate Agreement</h1>
        <p className="text-sm text-muted-foreground mb-8">HIPAA Compliance | Last Updated: April 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground">

          <h2 className="text-xl font-bold">1. Purpose</h2>
          <p>This Business Associate Agreement ("BAA") is entered into between the franchise partner ("Covered Entity") and Wellness Projection Lab LLC ("Business Associate") to ensure compliance with the Health Insurance Portability and Accountability Act of 1996 (HIPAA), the HITECH Act, and their implementing regulations (collectively, "HIPAA Rules").</p>

          <h2 className="text-xl font-bold">2. Definitions</h2>
          <p><strong>Protected Health Information (PHI):</strong> Any individually identifiable health information transmitted or maintained in any form or medium, including electronic PHI (ePHI).</p>
          <p><strong>Business Associate:</strong> Wellness Projection Lab LLC, which creates, receives, maintains, or transmits PHI on behalf of the Covered Entity through the Platform.</p>
          <p><strong>Covered Entity:</strong> The franchise partner who uses the Platform to manage patient/client health information.</p>

          <h2 className="text-xl font-bold">3. Obligations of Business Associate</h2>
          <p>Business Associate agrees to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Not use or disclose PHI other than as permitted by this BAA or as required by law</li>
            <li>Implement administrative, physical, and technical safeguards to protect ePHI</li>
            <li>Report any security incident or breach of unsecured PHI within 72 hours of discovery</li>
            <li>Ensure that subcontractors who access PHI agree to the same restrictions</li>
            <li>Make PHI available to individuals who request access under HIPAA</li>
            <li>Make PHI available for amendment upon request</li>
            <li>Maintain and make available an accounting of disclosures</li>
            <li>Make internal practices and records available to the Secretary of HHS for compliance review</li>
          </ul>

          <h2 className="text-xl font-bold">4. Security Measures</h2>
          <p>Business Associate implements the following security measures:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Encryption:</strong> All data encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
            <li><strong>Access Controls:</strong> Role-based access with individual authentication required for each user</li>
            <li><strong>Audit Logging:</strong> All access to PHI is logged with user ID, timestamp, and action type</li>
            <li><strong>Infrastructure:</strong> Hosted on SOC 2 Type II certified cloud infrastructure (Google Cloud Platform)</li>
            <li><strong>Backups:</strong> Automated daily backups with 30-day retention</li>
            <li><strong>Employee Training:</strong> All WPL personnel complete HIPAA training annually</li>
          </ul>

          <h2 className="text-xl font-bold">5. Breach Notification</h2>
          <p>In the event of a breach of unsecured PHI, Business Associate will:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Notify Covered Entity within 72 hours of discovery</li>
            <li>Provide the identity of affected individuals (if known)</li>
            <li>Describe the nature of the breach and types of PHI involved</li>
            <li>Describe the steps being taken to mitigate harm and prevent future breaches</li>
            <li>Cooperate with Covered Entity's breach notification obligations</li>
          </ul>

          <h2 className="text-xl font-bold">6. Obligations of Covered Entity</h2>
          <p>Covered Entity agrees to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Obtain necessary consents from patients/clients for the use of the Platform</li>
            <li>Notify Business Associate of any restrictions on use or disclosure of PHI</li>
            <li>Not request Business Associate to use or disclose PHI in violation of HIPAA Rules</li>
            <li>Ensure staff accounts use individual credentials (no shared logins)</li>
            <li>Remove staff access promptly upon termination of employment</li>
          </ul>

          <h2 className="text-xl font-bold">7. Term and Termination</h2>
          <p>This BAA remains in effect for the duration of the Franchise Service Agreement. Upon termination:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Business Associate will return or destroy all PHI within 30 days</li>
            <li>If return or destruction is not feasible, protections under this BAA continue</li>
            <li>Business Associate will certify in writing that PHI has been returned or destroyed</li>
          </ul>

          <h2 className="text-xl font-bold">8. Miscellaneous</h2>
          <p><strong>Amendment:</strong> This BAA shall be amended as necessary to comply with changes in HIPAA Rules.</p>
          <p><strong>Survival:</strong> Obligations regarding PHI protection survive termination of this BAA.</p>
          <p><strong>Governing Law:</strong> This BAA is governed by HIPAA Rules and the laws of the State of New Jersey.</p>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">By checking "I agree to the Business Associate Agreement" on the Franchise Application, you acknowledge that you have read, understood, and agree to be bound by the terms of this BAA.</p>
            <p className="text-sm text-muted-foreground mt-2">For questions, contact <a href="mailto:compliance@wellnessprojectionlab.com" className="text-primary">compliance@wellnessprojectionlab.com</a></p>
          </div>
        </div>
      </div>
    </main>
  )
}
