import Link from 'next/link'

export const metadata = {
  title: 'Data Ownership Policy',
}

export default function DataPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/franchise" className="text-sm text-primary hover:underline mb-6 block">&larr; Back to Franchise Application</Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Data Ownership Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: April 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground">

          <h2 className="text-xl font-bold">1. Your Data Belongs to You</h2>
          <p>All client, patient, and operational data entered into the Wellness Projection Lab Platform by the Franchisee, their staff, or their clients ("Franchisee Data") is owned exclusively by the Franchisee. WPL does not claim any ownership rights to Franchisee Data.</p>

          <h2 className="text-xl font-bold">2. What WPL Owns</h2>
          <p>WPL retains ownership of:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform software, source code, and infrastructure</li>
            <li>AI models, algorithms, and analytics engines</li>
            <li>Aggregated, anonymized, and de-identified usage statistics (no PHI)</li>
            <li>Platform design, user interface, and documentation</li>
          </ul>

          <h2 className="text-xl font-bold">3. Data Export</h2>
          <p>Franchisee may request a full export of their data at any time. Exports will be provided in standard formats (CSV, JSON) within 5 business days of request at no additional charge.</p>

          <h2 className="text-xl font-bold">4. Data Upon Termination</h2>
          <p>Upon termination of the Franchise Service Agreement:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>WPL will provide a complete data export within 30 days</li>
            <li>After export confirmation, WPL will permanently delete all Franchisee Data within 60 days</li>
            <li>WPL will provide written certification of data deletion</li>
            <li>Backups containing Franchisee Data will be purged within 90 days</li>
          </ul>

          <h2 className="text-xl font-bold">5. Data Security</h2>
          <p>While in WPL's custody, Franchisee Data is protected by:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>AES-256 encryption at rest</li>
            <li>TLS 1.3 encryption in transit</li>
            <li>Role-based access controls</li>
            <li>Automated daily backups</li>
            <li>SOC 2 Type II certified infrastructure</li>
            <li>HIPAA-compliant data handling per the BAA</li>
          </ul>

          <h2 className="text-xl font-bold">6. No Data Selling</h2>
          <p>WPL will never sell, share, license, or otherwise commercialize Franchisee Data or any PHI. WPL does not use Franchisee Data for advertising, marketing, or any purpose other than providing the Platform services.</p>

          <h2 className="text-xl font-bold">7. Data Portability</h2>
          <p>WPL supports data portability. Franchisee Data exports include:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Patient/client profiles and demographics</li>
            <li>Vitals history and medication records</li>
            <li>Meal logs and nutrition data</li>
            <li>Appointment records</li>
            <li>Medical documents and uploaded files</li>
            <li>Staff accounts and permission records</li>
            <li>Audit logs</li>
          </ul>

          <h2 className="text-xl font-bold">8. Contact</h2>
          <p>For data-related requests, including exports, deletion, or questions about this policy:</p>
          <p>Email: <a href="mailto:data@wellnessprojectionlab.com" className="text-primary">data@wellnessprojectionlab.com</a></p>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">By checking "I understand that client data belongs to me" on the Franchise Application, you acknowledge that you have read and understood this Data Ownership Policy.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
