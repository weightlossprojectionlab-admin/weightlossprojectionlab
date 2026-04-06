import Link from 'next/link'

export const metadata = {
  title: 'Franchise Service Agreement',
}

export default function FranchiseAgreementPage() {
  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/franchise" className="text-sm text-primary hover:underline mb-6 block">&larr; Back to Franchise Application</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Franchise Service Agreement</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: April 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground">

          <h2 className="text-xl font-bold">1. Parties</h2>
          <p>This Franchise Service Agreement ("Agreement") is entered into between Wellness Projection Lab LLC ("WPL", "we", "us") and the franchise partner ("Franchisee", "you") identified in the associated Franchise Application.</p>

          <h2 className="text-xl font-bold">2. Services Provided</h2>
          <p>WPL provides a white-label, HIPAA-compliant digital health management platform ("Platform") that includes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Branded subdomain (yourname.wellnessprojectionlab.com)</li>
            <li>Patient/family health tracking (vitals, medications, meals, appointments)</li>
            <li>AI-powered meal analysis and health reports</li>
            <li>Caregiver coordination and permission management</li>
            <li>Administrative dashboard for managing staff and clients</li>
            <li>Ongoing platform maintenance, security updates, and feature releases</li>
          </ul>

          <h2 className="text-xl font-bold">3. Fees and Payment</h2>
          <p><strong>Setup Fee:</strong> A one-time setup fee of $3,000 USD is due upon execution of this Agreement. This fee covers platform configuration, subdomain setup, branding customization, and initial onboarding.</p>
          <p><strong>Monthly Platform Fee:</strong> A recurring monthly fee based on the selected plan (Starter, Professional, or Enterprise) as outlined in the Franchise Application. Fees are billed on the 1st of each month.</p>
          <p><strong>Per-Seat License:</strong> An additional monthly fee per staff account as specified in the selected plan.</p>
          <p><strong>Late Payment:</strong> Invoices unpaid after 15 days will result in a warning notice. Invoices unpaid after 30 days may result in suspension of Platform access. Suspension does not relieve the obligation to pay outstanding amounts.</p>

          <h2 className="text-xl font-bold">4. Term and Termination</h2>
          <p><strong>Term:</strong> This Agreement is month-to-month unless an annual billing term is selected.</p>
          <p><strong>Termination by Franchisee:</strong> You may terminate this Agreement at any time with 30 days written notice. No refunds will be issued for partial months.</p>
          <p><strong>Termination by WPL:</strong> WPL may terminate this Agreement immediately for non-payment (after 30-day cure period), violation of the BAA, misuse of the Platform, or any activity that puts patient safety at risk.</p>
          <p><strong>Effect of Termination:</strong> Upon termination, WPL will export and deliver all Franchisee data within 30 days. Platform access will be revoked and the subdomain will be deactivated.</p>

          <h2 className="text-xl font-bold">5. Intellectual Property</h2>
          <p>WPL retains all intellectual property rights to the Platform, including but not limited to source code, algorithms, AI models, user interface designs, and documentation. Franchisee is granted a non-exclusive, non-transferable license to use the Platform for the duration of this Agreement.</p>
          <p>Franchisee retains all rights to their branding (logo, colors, business name) and client data.</p>

          <h2 className="text-xl font-bold">6. Service Level Agreement (SLA)</h2>
          <p><strong>Uptime:</strong> WPL guarantees 99.9% platform availability measured monthly, excluding scheduled maintenance windows.</p>
          <p><strong>Support:</strong> Response times vary by plan — Email (Starter), Priority (Professional), Dedicated Account Manager (Enterprise).</p>
          <p><strong>Credit:</strong> If uptime falls below 99.9% in any calendar month, Franchisee will receive a prorated credit on the next invoice.</p>

          <h2 className="text-xl font-bold">7. Confidentiality</h2>
          <p>Both parties agree to maintain the confidentiality of proprietary information disclosed during the course of this Agreement. This obligation survives termination for a period of 2 years.</p>

          <h2 className="text-xl font-bold">8. Limitation of Liability</h2>
          <p>WPL's total liability under this Agreement shall not exceed the total fees paid by Franchisee in the 12 months preceding the claim. WPL shall not be liable for indirect, incidental, consequential, or punitive damages.</p>

          <h2 className="text-xl font-bold">9. Indemnification</h2>
          <p>Franchisee agrees to indemnify and hold WPL harmless from any claims arising from Franchisee's use of the Platform, including but not limited to malpractice claims, regulatory violations, or unauthorized disclosure of patient information.</p>

          <h2 className="text-xl font-bold">10. Governing Law</h2>
          <p>This Agreement shall be governed by and construed in accordance with the laws of the State of New Jersey, without regard to its conflict of law provisions.</p>

          <h2 className="text-xl font-bold">11. Amendments</h2>
          <p>WPL reserves the right to modify this Agreement with 30 days written notice. Continued use of the Platform after such notice constitutes acceptance of the modified terms.</p>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">By checking "I agree to the Franchise Service Agreement" on the Franchise Application, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.</p>
            <p className="text-sm text-muted-foreground mt-2">For questions, contact <a href="mailto:legal@wellnessprojectionlab.com" className="text-primary">legal@wellnessprojectionlab.com</a></p>
          </div>
        </div>
      </div>
    </main>
  )
}
