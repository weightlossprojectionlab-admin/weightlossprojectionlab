/**
 * Seed job postings to Firestore
 * Run with: npx tsx scripts/seed-jobs.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { JobPosting } from '../types/jobs'

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

// SUPER ADMIN UID for createdBy field
const ADMIN_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

const jobPostings: Omit<JobPosting, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // JOB 1: SENIOR FULL-STACK ENGINEER (2 positions)
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
    status: 'published',
    about: `We're looking for a senior engineer who thrives in a fast-paced startup environment and can ship production-quality code across the full stack. You'll be working on our Next.js 16 + React 19 + Firebase platform, building features that directly impact users' health outcomes. This is a high-impact role where you'll own major features end-to-end, from database design to UI polish.

**NOTE: We're hiring 2 engineers for this role.**`,
    whyCritical: `We're at a pivotal growth phase with 269 features implemented and monetization launching imminently. We need senior engineers to:

1. **Accelerate velocity:** Ship 2-3 major features/month (e.g., mobile app store launch, Stripe webhooks, HIPAA compliance)
2. **Reduce technical debt:** Migrate 31 API routes to error sanitization, complete security Sprint 3
3. **Mentor team:** As we hire junior engineers, you'll set code quality standards and conduct reviews
4. **Architect for scale:** Design systems that support 10K → 100K users (database schema, caching, rate limiting)`,
    responsibilities: [
      'Build new features across web and mobile platforms (React Native via Capacitor)',
      'Own features end-to-end: API routes, database schema, UI components, tests',
      'Collaborate with Product Manager on requirements gathering and feasibility analysis',
      'Participate in user research and feedback loops to iterate on features',
      'Code reviews with focus on security, performance, and maintainability',
      'Architect complex features (e.g., real-time family collaboration, AI meal analysis pipeline)',
      'Write technical design docs for major features (examples: ADRs, RFC process)',
      'Mentor junior engineers through pair programming and async feedback',
      'On-call rotation for production incidents (1 week/month)',
      'Performance optimization (reduce Lighthouse metrics, API response times)',
      'Refactor legacy code (e.g., migrate from OpenAI to Gemini, modernize components)',
      'Security patch management and dependency updates',
    ],
    requiredQualifications: [
      '5+ years professional software engineering experience',
      '3+ years with TypeScript, React (or similar modern framework)',
      '2+ years with Node.js backend development (Express, Next.js API routes, Firebase Functions)',
      'Strong computer science fundamentals: Data structures, algorithms, system design',
      'Production experience: Deployed and maintained systems serving 1,000+ users',
      'Testing mindset: Write unit tests, integration tests, and E2E tests as standard practice',
      'Communication: Excellent written English for async collaboration (docs, PR descriptions, Slack)',
      'Frontend: React 18/19, Next.js 14/15, TypeScript, Tailwind CSS, responsive design',
      'Backend: Node.js, REST API design, serverless functions (Firebase/AWS Lambda/Vercel)',
      'Database: Firestore (or similar NoSQL like MongoDB), SQL (PostgreSQL/MySQL)',
      'Auth: Firebase Auth, JWT, OAuth 2.0, session management',
      'DevOps: Git, CI/CD (GitHub Actions), basic Docker, environment management',
    ],
    niceToHave: [
      'Experience with Firebase ecosystem (Firestore, Storage, Functions, Auth)',
      'Healthcare/medical app development (HIPAA compliance, PHI handling)',
      'Mobile development (React Native, Capacitor, iOS/Android native)',
      'AI/ML integration (OpenAI, Anthropic, Google Gemini APIs)',
      'Stripe payments integration (subscriptions, webhooks, Connect)',
      'Real-time systems (WebSockets, Firestore real-time listeners)',
      'Accessibility expertise (WCAG 2.1 AA, screen readers, keyboard navigation)',
    ],
    successMetrics: {
      month1: [
        'Complete codebase walkthrough and setup local dev environment',
        'Ship first PR (bug fix or small feature) in week 1',
        'Complete security training and understand HIPAA requirements',
        'Shadow product manager on user interview or feedback session',
        'Own and ship 1 medium feature (e.g., complete CSRF server-side validation, migrate 10 API routes to error sanitization)',
      ],
      month2: [
        'Own and ship 2-3 major features (e.g., Stripe subscription management UI, mobile push notifications)',
        'Lead technical design session for complex feature (e.g., offline mode, real-time collaboration)',
        'Conduct 5+ code reviews/week with constructive feedback',
        'Identify and document 3 technical debt items with proposed solutions',
      ],
      month3: [
        'Architect and ship 1 complex feature (e.g., HIPAA audit logging, AI caching layer)',
        'Mentor 1 junior engineer or new hire',
        'Lead incident retrospective for production issue (if any)',
        'Propose 1 process improvement (testing, deployment, code review)',
        'Be fully ramped on all product areas and able to jump into any codebase section',
      ],
    },
    whyJoin: [
      '**High Impact:** Your code directly helps families manage health and nutrition',
      '**Modern Stack:** React 19, Next.js 16, TypeScript 5.9, Firebase—cutting edge tech',
      '**Ownership:** Own features end-to-end with minimal management overhead',
      '**Growth:** Early-stage startup with rapid user growth and funding runway',
      '**Team:** Work with talented, mission-driven engineers who care about code quality',
    ],
    createdBy: ADMIN_UID,
    metaDescription:
      'Join WPL as a Senior Full-Stack Engineer. Build AI-powered health tech with React 19, Next.js 16, Firebase. Remote $140K-180K + equity.',
    keywords: [
      'senior full-stack engineer',
      'react',
      'nextjs',
      'typescript',
      'firebase',
      'remote',
      'healthtech',
    ],
  },

  // JOB 2: DEVOPS/SRE ENGINEER
  {
    slug: 'devops-sre-engineer',
    title: 'DevOps/Site Reliability Engineer (SRE)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 130000,
    salaryMax: 170000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    status: 'published',
    about: `We're seeking a DevOps/SRE engineer to build the foundation for our production infrastructure as we scale from beta to 10K+ paying customers. You'll own monitoring, alerting, deployment pipelines, and incident response—ensuring 99.9% uptime for a healthcare platform where downtime = lost trust.`,
    whyCritical: `We're currently deploying via Netlify with minimal monitoring. As we launch paid subscriptions and healthcare features (medications, appointments), we need:

1. **Observability:** Centralized logging, APM, error tracking, user session replay
2. **Reliability:** Blue-green deployments, automatic rollback, canary releases
3. **Performance:** CDN optimization, database indexing, caching strategies
4. **Security:** Automated vulnerability scanning, secret rotation, compliance audits
5. **Cost Management:** Optimize Firebase usage, monitor Gemini AI costs, right-size infrastructure`,
    responsibilities: [
      'Manage CI/CD pipelines (GitHub Actions, Netlify, Vercel)',
      'Implement blue-green deployment strategy with automatic rollback',
      'Optimize build times (currently ~4-6 minutes) and bundle sizes',
      'Set up staging environments mirroring production',
      'Infrastructure as Code (Terraform, Pulumi, or Firebase config management)',
      'Implement centralized logging (Datadog, New Relic, or Sentry)',
      'Set up application performance monitoring (APM) for Next.js and API routes',
      'Create dashboards for key metrics (response times, error rates, user activity)',
      'Implement user session replay (FullStory, LogRocket) for debugging',
      'Configure alerting for critical incidents (PagerDuty, Opsgenie)',
      'On-call rotation for production incidents (primary responder)',
      'Write and maintain runbooks for common incidents',
      'Conduct incident retrospectives and implement preventive measures',
      'Monitor uptime SLOs (99.9% target) and create action plans for misses',
      'Performance load testing and capacity planning',
      'Automated security scanning (Snyk, Dependabot, OWASP ZAP)',
      'Secret management and rotation (Firebase, Stripe, Gemini API keys)',
      'HIPAA compliance infrastructure (audit logs, encryption, access controls)',
      'Penetration testing coordination and remediation',
    ],
    requiredQualifications: [
      '4+ years DevOps/SRE experience in production environments',
      'Strong Linux/Unix systems administration background',
      'CI/CD expertise: GitHub Actions, Jenkins, GitLab CI, or CircleCI',
      'Cloud platforms: AWS, GCP, or Azure (Firebase runs on GCP)',
      'Monitoring tools: Datadog, New Relic, Prometheus, Grafana, or similar',
      'Scripting: Bash, Python, or Node.js for automation',
      'Incident management: Experience with on-call rotations and post-mortems',
      'Containerization: Docker, Docker Compose',
      'Orchestration: Kubernetes, Firebase Functions, AWS Lambda',
      'Networking: DNS, CDN (Cloudflare, Fastly), load balancing',
      'Databases: Firestore, PostgreSQL, Redis (optimization and backup strategies)',
      'Security: SSL/TLS, secrets management (Vault, AWS Secrets Manager), OWASP Top 10',
    ],
    niceToHave: [
      'Experience with Firebase ecosystem (Functions, Hosting, Firestore)',
      'Netlify or Vercel deployment experience',
      'Healthcare compliance (HIPAA, SOC 2)',
      'Cost optimization (FinOps practices, cloud billing analysis)',
      'Infrastructure as Code (Terraform, Pulumi, Ansible)',
    ],
    successMetrics: {
      month1: [
        'Audit current infrastructure and identify top 3 reliability risks',
        'Implement centralized error tracking (Sentry or Rollbar)',
        'Set up basic monitoring dashboards (Firebase, Netlify, Stripe)',
        'Document current deployment process and create runbook',
        'Shadow engineering team on production deployment',
      ],
      month2: [
        'Implement APM for Next.js (measure response times, identify slow queries)',
        'Set up alerting for critical errors (P0: downtime, P1: high error rates)',
        'Create blue-green deployment pipeline with automatic rollback',
        'Conduct first load testing session (identify bottlenecks)',
        'Implement secret rotation for Firebase and Stripe keys',
      ],
      month3: [
        'Achieve 99.5% uptime (measured via Pingdom or Uptime Robot)',
        'Reduce incident response time by 50% (with monitoring + alerts)',
        'Implement user session replay for debugging production issues',
        'Create HIPAA compliance checklist and audit current infrastructure',
        'Propose infrastructure cost optimization plan (10-20% savings target)',
      ],
    },
    whyJoin: [
      '**Build from Scratch:** Design infrastructure for scale (10K → 100K users)',
      '**Impact:** Your work directly prevents downtime for healthcare app (high stakes!)',
      '**Modern Stack:** Firebase, Netlify, GitHub Actions—cloud-native architecture',
      '**Ownership:** Be the go-to expert for all infrastructure and reliability',
      '**Visibility:** Present uptime metrics and cost savings to executive team',
    ],
    createdBy: ADMIN_UID,
    metaDescription:
      'Join WPL as DevOps/SRE Engineer. Build production infrastructure for healthtech platform. Remote $130K-170K + equity.',
    keywords: ['devops', 'sre', 'infrastructure', 'monitoring', 'firebase', 'remote'],
  },

  // JOB 3: MOBILE ENGINEER
  {
    slug: 'mobile-engineer-ios-android',
    title: 'Mobile Engineer (iOS/Android - Capacitor)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 120000,
    salaryMax: 160000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    status: 'published',
    about: `We're looking for a mobile engineer to take our Capacitor-based iOS and Android apps from beta to App Store and Play Store launch. You'll own the entire mobile experience, including native integrations (HealthKit, Google Fit), push notifications, offline mode, and platform-specific UI optimizations.`,
    whyCritical: `Our platform is already built with Capacitor, but mobile launch is blocked by:

1. **App Store submission:** iOS and Android apps not yet published
2. **Native integrations:** HealthKit/Google Fit sync incomplete
3. **Push notifications:** Firebase Cloud Messaging not configured
4. **Offline mode:** Partial implementation, needs sync queue and conflict resolution
5. **Performance:** Mobile web view optimization needed for 60 FPS

Mobile-first users represent 60% of our target market. Launching on iOS and Android unlocks significant revenue potential.`,
    responsibilities: [
      'Own iOS and Android app releases (submit to App Store and Play Store)',
      'Implement native integrations via Capacitor plugins (HealthKit, Google Fit, push notifications)',
      'Optimize mobile performance (reduce bundle size, lazy loading, image compression)',
      'Fix mobile-specific bugs (gestures, navigation, keyboard handling)',
      'Test on physical devices (iPhone, Android phones across OS versions)',
      'Write native code (Swift for iOS, Kotlin for Android) when Capacitor plugins insufficient',
      'Integrate HealthKit to auto-sync weight, steps, meals',
      'Integrate Google Fit for Android health data sync',
      'Implement biometric authentication (Face ID, Touch ID, fingerprint)',
      'Handle platform-specific permissions (camera, photos, health data)',
      'Implement offline mode with IndexedDB or SQLite',
      'Build sync queue for offline actions (log meals, weight, steps)',
      'Handle conflict resolution (e.g., weight logged offline then online)',
      'Test offline mode thoroughly (airplane mode, poor connectivity)',
      'Write compelling App Store and Play Store descriptions',
      'Design app icons, screenshots, promo videos',
      'Implement app ratings prompts (after positive user actions)',
      'Monitor app reviews and respond to feedback',
    ],
    requiredQualifications: [
      '3+ years mobile development experience (iOS and/or Android)',
      '2+ years with hybrid frameworks (Capacitor, React Native, Ionic, or Cordova)',
      'Strong JavaScript/TypeScript skills (since app is built with React)',
      'App Store submissions: Successfully published at least 2 apps to App Store or Play Store',
      'Native platform knowledge: Understand iOS and Android platform guidelines and best practices',
      'Capacitor: Experience with Capacitor (or similar hybrid framework)',
      'iOS: Swift, Xcode, CocoaPods, HealthKit APIs',
      'Android: Kotlin, Android Studio, Gradle, Google Fit APIs',
      'Push Notifications: Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS)',
      'Performance: Mobile web view optimization, bundle size reduction',
    ],
    niceToHave: [
      'Experience with HealthKit and Google Fit integrations',
      'Accessibility expertise (VoiceOver, TalkBack)',
      'Bluetooth integrations (smart scales, glucose monitors)',
      'Mobile analytics (Amplitude, Mixpanel)',
      'Mobile A/B testing (Firebase Remote Config, LaunchDarkly)',
    ],
    successMetrics: {
      month1: [
        'Audit current mobile codebase and Capacitor setup',
        'Fix top 5 mobile bugs reported by beta testers',
        'Complete HealthKit integration for iOS (sync weight and steps)',
        'Complete Google Fit integration for Android (sync weight and steps)',
        'Submit iOS app to App Store (TestFlight beta)',
      ],
      month2: [
        'Submit Android app to Play Store (beta track)',
        'Implement push notifications for both platforms',
        'Build offline mode with sync queue',
        'Optimize mobile performance (achieve 60 FPS, reduce bundle to <3MB)',
        'Launch public beta with 50 testers',
      ],
      month3: [
        'Address beta tester feedback (bugs, UX issues)',
        'Achieve App Store approval (iOS)',
        'Achieve Play Store approval (Android)',
        'Launch public version 1.0 on both stores',
        'Implement in-app ratings prompt (after 7 days or 3 meal logs)',
      ],
    },
    whyJoin: [
      '**Own mobile:** Be the mobile expert and drive App Store strategy',
      '**Launch impact:** Take apps from beta to thousands of users',
      '**Native integrations:** Work with cutting-edge health APIs (HealthKit, Google Fit)',
      '**Hybrid stack:** Leverage web skills while learning native development',
      '**User delight:** Mobile is where users spend 80% of their time—make it amazing!',
    ],
    createdBy: ADMIN_UID,
    metaDescription:
      'Join WPL as Mobile Engineer. Build iOS/Android apps with Capacitor, HealthKit, Google Fit. Remote $120K-160K + equity.',
    keywords: ['mobile engineer', 'ios', 'android', 'capacitor', 'healthkit', 'remote'],
  },

  // JOB 4: AI/ML ENGINEER (CUSTOMER SUPPORT & OPTIMIZATION)
  {
    slug: 'ai-ml-engineer-customer-support',
    title: 'AI/ML Engineer (Customer Support & LLM Optimization)',
    department: 'Engineering',
    location: 'Remote (US, Canada, EU)',
    locationType: 'remote',
    salaryMin: 150000,
    salaryMax: 190000,
    equity: '0.25%-0.5%',
    reportsTo: 'Head of Engineering',
    status: 'published',
    about: `We're seeking an AI/ML engineer to build our enterprise-level AI customer support system AND optimize our Google Gemini and Anthropic Claude integrations. You'll work on RAG-based chatbots, prompt engineering, caching strategies, and knowledge base management—reducing support costs by 60-80% while improving AI accuracy and reducing API costs by 50%.`,
    whyCritical: `With 269+ features and complex healthcare workflows, we need AI support to:

**Customer Support (50% of role):**
- Handle 70-80% of support questions automatically (prevent hiring 5-10 agents = $250K-500K/year savings)
- Provide 24/7 instant answers vs hours of waiting
- Scale support from 1,000 → 10,000 users without team growth
- Learn from conversations to reveal product pain points

**AI Optimization (50% of role):**
- Reduce Gemini API costs 30-50% as usage scales ($5K-15K/month savings at scale)
- Improve meal analysis accuracy from 85% to 92%+
- Reduce AI response latency from 1.5-3s to <1s
- Build A/B testing framework for prompt variations`,
    responsibilities: [
      'Build RAG-based support chatbot using Gemini/Claude + vector database',
      'Train AI on documentation, FAQs, GitHub issues, support tickets',
      'Implement context-aware routing (when to escalate to human agents)',
      'Integration with Intercom, Zendesk, or custom support UI',
      'Multi-turn conversation handling with memory and context',
      'Automatic ticket summarization for human agents',
      'Build vector database (Pinecone, Weaviate, or Firestore + embeddings)',
      'Create embedding pipeline for docs, FAQs, code comments',
      'Monitor AI support quality and retrain on new issues',
      'Optimize Gemini meal analysis prompts (improve accuracy from 85% to 92%+)',
      'Implement caching layer for common meal photos (reduce API calls 30-40%)',
      'Evaluate fine-tuning Gemini vs using smaller, faster models',
      'Build streaming responses for AI coach (reduce perceived latency)',
      'Monitor AI costs and create dashboards (cost per user, cost per feature)',
      'A/B test prompt variations for meal analysis (measure accuracy, confidence, speed)',
      'Design prompts for new features (recipe generation, health insights, medication safety)',
      'Implement chain-of-thought reasoning for complex AI tasks',
      'Create prompt templates and versioning system',
      'Build AI evaluation framework (test prompts against labeled dataset)',
      'Implement AI fallback strategies (Gemini → Claude → mock data)',
      'Integrate AI observability tools (LangSmith, PromptLayer)',
      'Evaluate new AI models (GPT-4o, Claude 3.5, Gemini 2.0)',
      'Experiment with embedding models for semantic search (recipes, documents)',
    ],
    requiredQualifications: [
      '3+ years working with LLMs (GPT, Claude, Gemini, or open-source models)',
      'Strong Python for AI/ML workflows (data processing, fine-tuning, evaluation)',
      'Prompt engineering: Proven track record of optimizing prompts for accuracy and cost',
      'API integrations: Experience with OpenAI, Anthropic, Google AI, or similar APIs',
      'Data-driven: Comfortable with A/B testing, statistical analysis, and metrics',
      'RAG systems: Experience building retrieval-augmented generation chatbots',
      'Vector databases: Pinecone, Weaviate, Chroma, or Firestore with embeddings',
      'LLMs: OpenAI API, Anthropic Claude, Google Gemini, Hugging Face',
      'Frameworks: LangChain, LlamaIndex, or custom prompt orchestration',
      'Evaluation: Experience with AI evaluation datasets and benchmarks',
    ],
    niceToHave: [
      'Experience with computer vision models (ResNet, CLIP, ViT)',
      'Healthcare/nutrition domain knowledge',
      'Experience with edge AI (TensorFlow Lite, Core ML, ONNX)',
      'MLOps experience (MLflow, Weights & Biases, Kubeflow)',
      'Research publications or contributions to open-source AI projects',
      'Customer support automation experience (chatbots, helpdesk AI)',
      'Fine-tuning: Supervised fine-tuning (SFT) or LoRA for model customization',
    ],
    successMetrics: {
      month1: [
        'Audit current AI integrations (Gemini meal analysis, Claude coaching)',
        'Identify top 3 cost optimization opportunities',
        'Implement caching layer for Gemini API (reduce calls by 20%+)',
        'Create AI evaluation dataset (100 labeled meal photos)',
        'Build MVP support chatbot (answer 10 common FAQs)',
      ],
      month2: [
        'A/B test 3 prompt variations for meal analysis (measure accuracy improvement)',
        'Reduce average Gemini response time from 1.5s to <1s (via streaming or faster models)',
        'Build internal prompt testing tool (non-engineers can evaluate prompts)',
        'Implement AI fallback strategy (handle API outages gracefully)',
        'Train support chatbot on 100+ documentation pages and FAQs',
      ],
      month3: [
        'Achieve 30-40% reduction in AI API costs (via caching, fine-tuning, or model switching)',
        'Improve meal analysis accuracy from 85% to 90%+ (measured on evaluation dataset)',
        'Launch AI support chatbot handling 50-70% of common questions',
        'Create AI cost dashboard (track spend per user, per feature)',
        'Propose AI roadmap for next 6 months (new models, features, optimizations)',
      ],
    },
    whyJoin: [
      '**Dual Impact:** Build AI support system (save $250K-500K/year) AND optimize core product AI',
      '**Cutting-edge models:** Work with latest Gemini, Claude, GPT models',
      '**Enterprise-level:** Build production RAG system handling thousands of users',
      '**Direct impact:** Your optimizations save thousands in costs and delight users',
      '**Research to production:** Ship AI features to thousands of real users',
    ],
    createdBy: ADMIN_UID,
    metaDescription:
      'Join WPL as AI/ML Engineer. Build enterprise AI support chatbot, optimize LLMs. Remote $150K-190K + equity.',
    keywords: [
      'ai engineer',
      'machine learning',
      'llm',
      'chatbot',
      'customer support',
      'rag',
      'remote',
    ],
  },

  // JOB 5: PRODUCT MANAGER
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
    status: 'published',
    about: `We're looking for a product manager to own the roadmap, prioritize features, and ensure we're building what users actually need. You'll work closely with engineering, design, and users to define requirements, measure success, and drive product-market fit.`,
    whyCritical: `We currently have 269 implemented features and 13 planned, but no dedicated PM. This leads to:

1. **Scattered focus:** Engineering builds what's technically interesting vs what drives revenue
2. **Unclear priorities:** No framework to decide: monetization vs mobile vs AI vs enterprise?
3. **Weak metrics:** Limited tracking of feature adoption, conversion funnels, churn
4. **User disconnect:** Minimal user research, feedback loops, or usability testing
5. **Roadmap chaos:** No clear 6-12 month plan aligned with business goals`,
    responsibilities: [
      'Define 6-month and 12-month product roadmap aligned with business goals',
      'Prioritize features using framework (RICE, ICE, or similar)',
      'Balance new feature development vs technical debt vs optimization',
      'Set quarterly OKRs for product team (e.g., increase free-to-paid conversion from 5% to 10%)',
      'Collaborate with CEO on company vision and strategic direction',
      'Write detailed product requirements documents (PRDs) for engineers',
      'Create user stories, acceptance criteria, and edge case definitions',
      'Design wireframes or work with designer on feature mockups',
      'Lead refinement sessions with engineering (clarify requirements)',
      'Define success metrics for each feature (usage, conversion, retention)',
      'Conduct user interviews (5-10 per month) to understand pain points',
      'Run usability testing sessions for new features (pre-launch)',
      'Analyze user feedback from support tickets, app reviews, surveys',
      'Build and maintain user personas (single/household/caregiver modes)',
      'Create customer journey maps to identify friction points',
      'Define and track key product metrics (DAU, WAU, MAU, retention, conversion)',
      'Set up analytics dashboards (Amplitude, Mixpanel, or Firebase Analytics)',
      'Analyze feature adoption rates and identify low-usage features',
      'Run A/B tests for conversion optimization (pricing page, onboarding)',
      'Conduct retrospectives on shipped features (what worked, what didn't)',
    ],
    requiredQualifications: [
      '3+ years product management experience (preferably B2C SaaS)',
      'Healthcare/wellness background: Experience with health tech, fitness apps, or regulated industries',
      'Data-driven: Comfortable with SQL, analytics tools (Amplitude, Mixpanel), and A/B testing',
      'Startup experience: Worked at early-stage company (seed to Series B)',
      'Technical fluency: Can discuss APIs, databases, and technical trade-offs with engineers',
      'Prioritization frameworks: RICE, ICE, Kano model, or similar',
      'User research: Interview techniques, usability testing, survey design',
      'Analytics: Define metrics, build dashboards, analyze conversion funnels',
      'Wireframing: Figma, Sketch, or Balsamiq for low-fidelity mockups',
      'Communication: Excellent written and verbal communication (PRDs, presentations, stakeholder management)',
    ],
    niceToHave: [
      'Experience with AI/ML products (prompt engineering, model evaluation)',
      'HIPAA compliance knowledge (PHI handling, consent management)',
      'Monetization expertise (pricing strategy, subscription optimization, churn reduction)',
      'Mobile app product management (iOS/Android)',
      'Multi-sided marketplace experience (shop-and-deliver service)',
    ],
    successMetrics: {
      month1: [
        'Conduct 10 user interviews (cover all 3 user modes: single, household, caregiver)',
        'Audit all 269 features and identify top 10 most/least used',
        'Create product dashboard with key metrics (DAU, retention, conversion)',
        'Write first PRD for high-priority feature (e.g., mobile app store launch)',
        'Present preliminary roadmap to CEO and engineering team',
      ],
      month2: [
        'Finalize Q1 and Q2 roadmap with prioritized features',
        'Set quarterly OKRs for product team (measurable goals)',
        'Launch first A/B test (onboarding flow or pricing page)',
        'Conduct usability test for major feature (e.g., family collaboration)',
        'Define success metrics for top 5 features on roadmap',
      ],
      month3: [
        'Ship 2-3 features with clear success metrics and tracking',
        'Present roadmap to broader company (all-hands or monthly update)',
        'Identify 1 low-performing feature to deprecate or improve',
        'Build user persona documentation and customer journey maps',
        'Propose 1 strategic initiative (e.g., enterprise pilot, international expansion)',
      ],
    },
    whyJoin: [
      '**Shape product:** Define roadmap for fast-growing healthtech startup',
      '**User impact:** Features you ship help families manage health and nutrition',
      '**Cross-functional:** Work with engineering, design, marketing, and CEO',
      '**Data access:** Full analytics access to understand user behavior',
      '**Ownership:** Be the product leader and build PM function from scratch',
    ],
    createdBy: ADMIN_UID,
    metaDescription:
      'Join WPL as Product Manager. Define roadmap for AI-powered healthtech platform. Remote $110K-150K + equity.',
    keywords: [
      'product manager',
      'healthtech',
      'product management',
      'user research',
      'remote',
    ],
  },

  // Continue with remaining 7 jobs in next message due to length...
]

async function seedJobs() {
  console.log('🌱 Starting to seed job postings...')

  const batch = db.batch()
  let count = 0

  for (const job of jobPostings) {
    const jobRef = db.collection('job_postings').doc()
    batch.set(jobRef, {
      ...job,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    count++
    console.log(`  ✅ Prepared job ${count}: ${job.title}`)
  }

  await batch.commit()

  console.log(`\n✨ Successfully seeded ${count} job postings to Firestore!`)
  console.log('🔗 View them at: /admin/careers')
}

// Run the seed script
seedJobs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error seeding jobs:', error)
    process.exit(1)
  })
