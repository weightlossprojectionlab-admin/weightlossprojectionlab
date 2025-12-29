/**
 * Simplified seed script for job postings
 * Run with: npx tsx scripts/seed-jobs-simple.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (getApps().length === 0) {
  // Try base64-encoded service account first
  const base64ServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64

  if (base64ServiceAccount) {
    const serviceAccount = JSON.parse(
      Buffer.from(base64ServiceAccount, 'base64').toString('utf8')
    )
    initializeApp({
      credential: cert(serviceAccount),
    })
  } else {
    // Fallback to individual env vars
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

const db = getFirestore()
const ADMIN_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

const jobs = [
  {
    slug: 'senior-full-stack-engineer',
    title: 'Senior Full-Stack Engineer (TypeScript/React/Firebase)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 140000,
    salaryMax: 180000,
    equity: '0.25%-0.75%',
    reportsTo: 'Head of Engineering',
    about: 'Build AI-powered health tech with React 19, Next.js 16, and Firebase. Ship features that help families manage health and nutrition.',
    whyCritical: 'Accelerate velocity 2x, reduce technical debt, mentor team, architect for scale (10K → 100K users).',
    responsibilities: [
      'Build features across web and mobile platforms',
      'Own features end-to-end: API routes, database, UI, tests',
      'Code reviews and technical mentorship',
      'On-call rotation for production incidents',
    ],
    requiredQualifications: [
      '5+ years software engineering experience',
      '3+ years TypeScript and React',
      '2+ years Node.js backend development',
      'Production experience serving 1,000+ users',
    ],
    niceToHave: [
      'Firebase ecosystem experience',
      'Healthcare/HIPAA compliance',
      'Mobile development (Capacitor, React Native)',
      'AI/ML integrations',
    ],
    successMetrics: {
      month1: ['Setup dev environment', 'Ship first PR', 'Complete security training'],
      month2: ['Ship 2-3 major features', 'Lead technical design session'],
      month3: ['Architect complex feature', 'Mentor junior engineer'],
    },
    whyJoin: [
      'High impact: Help families manage health',
      'Modern stack: React 19, Next.js 16, Firebase',
      'Ownership: End-to-end feature ownership',
    ],
    status: 'published',
  },
  {
    slug: 'devops-sre-engineer',
    title: 'DevOps/Site Reliability Engineer',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 130000,
    salaryMax: 170000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    about: 'Build production infrastructure, monitoring, and deployment pipelines for healthtech platform scaling to 10K+ users.',
    whyCritical: 'Ensure 99.9% uptime, implement observability, optimize costs, complete HIPAA compliance infrastructure.',
    responsibilities: [
      'Manage CI/CD pipelines and deployments',
      'Implement monitoring and alerting',
      'On-call rotation for incidents',
      'Security scanning and compliance',
    ],
    requiredQualifications: [
      '4+ years DevOps/SRE experience',
      'CI/CD expertise (GitHub Actions, etc.)',
      'Cloud platforms (AWS, GCP, Azure)',
      'Monitoring tools (Datadog, Sentry)',
    ],
    niceToHave: [
      'Firebase ecosystem experience',
      'Healthcare compliance (HIPAA, SOC 2)',
      'Infrastructure as Code',
    ],
    successMetrics: {
      month1: ['Audit infrastructure', 'Implement error tracking'],
      month2: ['Set up APM', 'Create deployment pipeline'],
      month3: ['Achieve 99.5% uptime', 'HIPAA compliance checklist'],
    },
    whyJoin: [
      'Build from scratch: Design for scale',
      'High stakes: Healthcare app uptime',
      'Modern stack: Firebase, Netlify',
    ],
    status: 'published',
  },
  {
    slug: 'mobile-engineer-ios-android',
    title: 'Mobile Engineer (iOS/Android)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 120000,
    salaryMax: 160000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    about: 'Launch iOS/Android apps with HealthKit/Google Fit integrations. Own App Store submission and mobile experience.',
    whyCritical: 'Mobile-first users represent 60% of TAM. Launch blocked by App Store submission and native integrations.',
    responsibilities: [
      'Submit apps to App Store and Play Store',
      'Implement HealthKit/Google Fit sync',
      'Build offline mode and sync',
      'Optimize mobile performance (60 FPS)',
    ],
    requiredQualifications: [
      '3+ years mobile development',
      '2+ years hybrid frameworks (Capacitor, React Native)',
      'Published 2+ apps to stores',
      'Swift/Kotlin for native code',
    ],
    niceToHave: [
      'HealthKit/Google Fit experience',
      'Accessibility (VoiceOver, TalkBack)',
      'Bluetooth integrations',
    ],
    successMetrics: {
      month1: ['Complete HealthKit integration', 'Submit to TestFlight'],
      month2: ['Implement push notifications', 'Build offline mode'],
      month3: ['App Store approval', 'Launch v1.0'],
    },
    whyJoin: [
      'Own mobile: Drive App Store strategy',
      'Launch impact: Beta to thousands of users',
      'Native integrations: HealthKit, Google Fit',
    ],
    status: 'published',
  },
  {
    slug: 'ai-ml-engineer-customer-support',
    title: 'AI/ML Engineer (Customer Support & Optimization)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 150000,
    salaryMax: 190000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    about: 'Build enterprise AI support chatbot AND optimize Gemini/Claude integrations. Save $250K-500K/year in support costs.',
    whyCritical: 'Scale support 1K → 10K users without hiring agents. Reduce AI costs 50% as usage scales.',
    responsibilities: [
      'Build RAG-based support chatbot',
      'Train on docs, FAQs, tickets',
      'Optimize Gemini meal analysis prompts',
      'Implement caching layer (reduce API costs 30-40%)',
    ],
    requiredQualifications: [
      '3+ years working with LLMs',
      'Prompt engineering expertise',
      'RAG and vector database experience',
      'Python for AI/ML workflows',
    ],
    niceToHave: [
      'Healthcare/nutrition domain knowledge',
      'Customer support automation',
      'MLOps experience',
    ],
    successMetrics: {
      month1: ['Build MVP chatbot', 'Implement caching layer'],
      month2: ['A/B test prompts', 'Train on 100+ docs'],
      month3: ['Handle 50-70% of support questions', 'Reduce AI costs 30-40%'],
    },
    whyJoin: [
      'Dual impact: Support automation + AI optimization',
      'Enterprise-level RAG system',
      'Direct cost savings impact',
    ],
    status: 'published',
  },
  {
    slug: 'product-manager-healthtech',
    title: 'Product Manager (HealthTech)',
    department: 'Product',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 110000,
    salaryMax: 150000,
    equity: '0.5%-1%',
    reportsTo: 'CEO',
    about: 'Define roadmap, prioritize features, drive product-market fit for AI-powered health platform with 269 features.',
    whyCritical: 'No PM = scattered focus, unclear priorities, weak metrics. Need strategic direction aligned with business goals.',
    responsibilities: [
      'Define 6-12 month roadmap',
      'Prioritize using RICE/ICE framework',
      'Conduct 5-10 user interviews/month',
      'Set quarterly OKRs and track metrics',
    ],
    requiredQualifications: [
      '3+ years product management (B2C SaaS)',
      'Healthcare/wellness background',
      'Data-driven (SQL, analytics tools)',
      'Startup experience (seed to Series B)',
    ],
    niceToHave: [
      'AI/ML products experience',
      'HIPAA compliance knowledge',
      'Monetization expertise',
    ],
    successMetrics: {
      month1: ['Conduct 10 user interviews', 'Audit all features'],
      month2: ['Finalize Q1/Q2 roadmap', 'Launch first A/B test'],
      month3: ['Ship 2-3 features with metrics', 'Build user personas'],
    },
    whyJoin: [
      'Shape product: Define roadmap',
      'User impact: Help families manage health',
      'Cross-functional: Work with CEO and engineering',
    ],
    status: 'published',
  },
]

async function seedJobs() {
  console.log('🌱 Seeding job postings to Firestore...\n')

  const batch = db.batch()
  let count = 0

  for (const job of jobs) {
    const jobRef = db.collection('job_postings').doc()
    batch.set(jobRef, {
      ...job,
      createdBy: ADMIN_UID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    count++
    console.log(`  ✅ ${count}. ${job.title} ($${job.salaryMin / 1000}K-${job.salaryMax / 1000}K)`)
  }

  await batch.commit()

  console.log(`\n✨ Successfully seeded ${count} job postings!`)
  console.log('🔗 View at: http://localhost:3000/admin/careers')
  console.log('\n💡 TIP: Add remaining 7 positions through admin UI or extend this script.')
}

seedJobs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error seeding jobs:', error)
    process.exit(1)
  })
