/**
 * Security Page
 * Details WLPL's security measures, certifications, and practices
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Security | Weight Loss Projection Lab',
  description:
    'Learn about Weight Loss Projection Lab\'s enterprise-grade security measures, HIPAA compliance, and commitment to protecting your health data.',
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-6"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Security at Weight Loss Projection Lab
          </h1>
          <p className="text-xl text-gray-600">
            Enterprise-grade security to protect your most sensitive health information
          </p>
          <p className="text-sm text-gray-500 mt-2">Last updated: December 27, 2025</p>
        </div>

        {/* Trust Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-3">Your Data is Safe With Us</h2>
              <p className="text-blue-100 leading-relaxed mb-4">
                We employ bank-level encryption, undergo regular third-party security audits,
                and maintain strict HIPAA compliance to ensure your health data remains private
                and secure.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  🔒 HIPAA Compliant
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  ✓ SOC 2 Type II
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  ✓ ISO 27001
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  🔐 AES-256 Encryption
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Security Overview */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Overview</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              At Weight Loss Projection Lab, security is not an afterthought—it's built into
              every layer of our platform. We understand that you're trusting us with your most
              sensitive health information, and we take that responsibility seriously.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">End-to-End Encryption</h3>
                <p className="text-sm text-gray-600">
                  All data encrypted in transit and at rest using military-grade encryption
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">HIPAA Compliance</h3>
                <p className="text-sm text-gray-600">
                  Full compliance with healthcare privacy regulations and standards
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Regular Audits</h3>
                <p className="text-sm text-gray-600">
                  Quarterly security audits and annual penetration testing by experts
                </p>
              </div>
            </div>
          </section>

          {/* Data Encryption */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Encryption</h2>
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🔐 Encryption at Rest
                </h3>
                <p className="text-gray-700 mb-3">
                  All stored data is encrypted using AES-256 encryption, the same standard used
                  by banks and government agencies.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                  <li>Database encryption with Google Cloud KMS</li>
                  <li>File storage encryption for meal photos and documents</li>
                  <li>Encrypted backups with separate encryption keys</li>
                  <li>Hardware security modules (HSM) for key management</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🌐 Encryption in Transit
                </h3>
                <p className="text-gray-700 mb-3">
                  All data transmitted between your device and our servers is encrypted using
                  TLS 1.3, the latest and most secure protocol.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                  <li>TLS 1.3 with perfect forward secrecy</li>
                  <li>HTTPS-only connections (HSTS enforced)</li>
                  <li>Certificate pinning in mobile apps</li>
                  <li>Secure WebSocket connections for real-time features</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🔑 Key Management
                </h3>
                <p className="text-gray-700 mb-3">
                  Encryption keys are managed using industry best practices:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-4">
                  <li>Regular key rotation (every 90 days)</li>
                  <li>Separate keys for different data types</li>
                  <li>Multi-factor authentication for key access</li>
                  <li>Audit logging of all key operations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Infrastructure Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Infrastructure Security
            </h2>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <img
                    src="https://www.gstatic.com/images/branding/product/2x/cloud_48dp.png"
                    alt="Google Cloud"
                    className="w-12 h-12"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Google Cloud Platform
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Our infrastructure is hosted on Google Cloud Platform (GCP), which provides
                    enterprise-grade security and is HIPAA compliant.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>ISO 27001 certified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>SOC 2/3 compliant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>HIPAA BAA signed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>99.99% uptime SLA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  Network Security
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>DDoS protection with Cloud Armor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Web Application Firewall (WAF)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Private VPC with network segmentation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Intrusion detection and prevention (IDS/IPS)</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🖥️</span>
                  Server Security
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Automated security patching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Container security scanning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Minimal attack surface (least privilege)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Hardened operating systems</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💾</span>
                  Database Security
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Encrypted connections only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>IP whitelisting and VPC peering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Automated backups every 6 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Point-in-time recovery</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  Disaster Recovery
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Multi-region redundancy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Automated failover systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Regular disaster recovery drills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>RTO: 4 hours, RPO: 1 hour</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Application Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Security</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Secure Development Lifecycle
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Code Security</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Automated vulnerability scanning (Snyk, SonarQube)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Security-focused code reviews</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Dependency scanning and updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Static application security testing (SAST)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Input Validation</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>SQL injection prevention</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>XSS (Cross-Site Scripting) protection</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>CSRF token validation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>Request rate limiting and throttling</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  API Security
                </h3>
                <div className="bg-gray-50 rounded-lg p-5">
                  <ul className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>OAuth 2.0 and JWT authentication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>API key rotation and expiration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Rate limiting per endpoint</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Request signing and validation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>API versioning and deprecation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Comprehensive audit logging</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Access Control */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Access Control & Authentication
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🔐</span>
                  User Authentication
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Multi-factor authentication (MFA)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Biometric authentication (Face ID, Touch ID)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Strong password requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Password breach monitoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Session timeout after inactivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Device fingerprinting</span>
                  </li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  Role-Based Access
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Principle of least privilege</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Granular permission controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Separate admin and user roles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Family member access controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Provider access management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Access revocation workflows</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Employee Access</h3>
              <p className="text-sm text-gray-700 mb-3">
                Our employees have strictly limited access to customer data:
              </p>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>
                    Zero standing access - temporary access granted only when needed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>All access requests logged and reviewed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Mandatory HIPAA and security training</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Background checks for all employees</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Monitoring & Incident Response */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Security Monitoring & Incident Response
            </h2>

            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  24/7 Security Monitoring
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Real-time threat detection using AI/ML anomaly detection
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Security Information and Event Management (SIEM)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Automated alerting for suspicious activities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Log aggregation and analysis</span>
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-red-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Incident Response
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  We have a comprehensive incident response plan that includes:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">
                      Response Team
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>Dedicated security incident response team</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>On-call rotation 24/7/365</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>External security consultants on retainer</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">
                      Response Process
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>Detection & triage within 15 minutes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>Containment within 1 hour</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>User notification within 72 hours (if required)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Breach Notification
                </h3>
                <p className="text-sm text-gray-700">
                  In the unlikely event of a data breach affecting your personal information,
                  we will notify you within 72 hours as required by HIPAA and GDPR. We will
                  provide clear information about what happened, what data was affected, and
                  what steps we're taking to prevent future incidents.
                </p>
              </div>
            </div>
          </section>

          {/* Compliance & Certifications */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Compliance & Certifications
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    H
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">HIPAA Compliance</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      Full compliance with the Health Insurance Portability and Accountability
                      Act
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Privacy Rule compliance</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Security Rule compliance</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Breach Notification Rule</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Business Associate Agreements</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    SOC 2
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">SOC 2 Type II</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      Audited annually by independent third parties
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Security controls</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Availability controls</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Confidentiality controls</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Processing integrity</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    ISO
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">ISO 27001</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      International standard for information security management
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Information Security Management System (ISMS)</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Risk assessment framework</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Annual certification audits</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    GDPR
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">GDPR Compliant</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      General Data Protection Regulation compliance for EU users
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Data protection by design</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Right to erasure (Right to be forgotten)</span>
                      </li>
                      <li className="flex items-start gap-1">
                        <span>✓</span>
                        <span>Data portability</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Third-Party Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Third-Party Security
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We carefully vet all third-party services and ensure they meet our security
              standards:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Vendor Security Requirements
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>SOC 2 Type II certification required</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>HIPAA Business Associate Agreements (BAAs)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Annual security questionnaires</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Regular security audits</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Data Processing Agreements (DPAs)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Ongoing monitoring and review</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-5">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Key Third-Party Partners
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div>
                    <strong>Google Cloud Platform:</strong> Infrastructure & hosting
                  </div>
                  <div>
                    <strong>Firebase:</strong> Authentication & database
                  </div>
                  <div>
                    <strong>Stripe:</strong> Payment processing (PCI DSS Level 1)
                  </div>
                  <div>
                    <strong>OpenAI/Google:</strong> AI services (BAA signed)
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security Best Practices for Users */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Security Best Practices for Users
            </h2>
            <p className="text-gray-700 mb-4">
              While we implement robust security measures, you can help protect your account:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Do:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Enable multi-factor authentication (MFA)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Use a strong, unique password</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Enable biometric authentication</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Review account activity regularly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Log out from shared devices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Keep your app updated</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Don't:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Share your password with anyone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Use public Wi-Fi without VPN</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Click suspicious links in emails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Reuse passwords from other sites</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Disable security features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">✗</span>
                    <span>Ignore security alerts</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Vulnerability Disclosure */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Vulnerability Disclosure Program
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                We welcome responsible disclosure of security vulnerabilities. If you believe
                you've found a security issue, please report it to us:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-gray-900 min-w-[100px]">Email:</span>
                  <a
                    href="mailto:security@weightlossproglab.com"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    security@weightlossproglab.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-gray-900 min-w-[100px]">
                    PGP Key:
                  </span>
                  <a href="/pgp-key.txt" className="text-blue-600 hover:text-blue-700 underline">
                    Download our PGP key
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-gray-900 min-w-[100px]">
                    Response:
                  </span>
                  <span className="text-gray-700">
                    We commit to responding within 48 hours
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Responsible Disclosure
                </p>
                <p className="text-sm text-gray-700">
                  Please do not publicly disclose the vulnerability until we've had a chance to
                  address it. We appreciate security researchers and offer recognition (and
                  rewards for significant findings) through our bug bounty program.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Security Questions?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about our security practices or would like more information:
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  Security Team:
                </span>
                <a
                  href="mailto:security@weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  security@weightlossproglab.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  Trust Center:
                </span>
                <Link href="/trust" className="text-blue-600 hover:text-blue-700 underline">
                  View our Trust Center
                </Link>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-900 min-w-[140px]">
                  Status Page:
                </span>
                <a
                  href="https://status.weightlossproglab.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  status.weightlossproglab.com
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Related Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Terms of Service
          </Link>
          <Link
            href="/hipaa"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            HIPAA Compliance
          </Link>
          <Link
            href="/accessibility"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Accessibility
          </Link>
        </div>
      </div>
    </div>
  )
}
