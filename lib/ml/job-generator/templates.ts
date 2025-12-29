/**
 * Job Description Templates
 * Template-based job description generation
 *
 * STANDALONE ML SYSTEM - Does NOT use OpenAI or external APIs
 *
 * Uses structured templates with dynamic content insertion
 */

import type { RoleClassification } from './classifier'
import type { CodebaseFeatures } from './feature-extractor'
import type { JobPosting, JobSuccessMetrics } from '@/types/jobs'

/**
 * Generate complete job posting from classification
 */
export function generateJobPosting(
  classification: RoleClassification,
  features: CodebaseFeatures
): Partial<JobPosting> {
  const title = generateTitle(classification)
  const slug = generateSlug(title)
  const salary = generateSalary(classification.seniority)
  const equity = generateEquity(classification.seniority)
  const location = 'Remote (US, Canada, EU)'
  const reportsTo = generateReportsTo(classification.department, classification.seniority)

  const about = generateAbout(classification, features)
  const whyCritical = generateWhyCritical(classification, features)
  const responsibilities = generateResponsibilities(classification, features)
  const requiredQualifications = generateQualifications(classification, features)
  const niceToHave = generateNiceToHave(classification, features)
  const successMetrics = generateSuccessMetrics(classification)
  const whyJoin = generateWhyJoin()

  return {
    slug,
    title,
    department: classification.department,
    location,
    locationType: 'remote',
    salaryMin: salary.min,
    salaryMax: salary.max,
    equity,
    reportsTo,
    about,
    whyCritical,
    responsibilities,
    requiredQualifications,
    niceToHave,
    successMetrics,
    whyJoin,
    status: 'draft',
  }
}

/**
 * Generate job title
 */
function generateTitle(classification: RoleClassification): string {
  const { role, seniority } = classification
  const techStack = classification.techStack.slice(0, 2).join(' & ')

  // For senior+ roles, include tech stack in title
  if (seniority === 'Senior' || seniority === 'Staff' || seniority === 'Principal') {
    if (techStack) {
      return `${seniority} ${role} - ${techStack}`
    }
  }

  return `${seniority} ${role}`
}

/**
 * Generate URL slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generate salary range
 */
function generateSalary(seniority: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    Junior: { min: 70000, max: 100000 },
    'Mid-Level': { min: 100000, max: 140000 },
    Senior: { min: 140000, max: 180000 },
    Staff: { min: 180000, max: 220000 },
    Principal: { min: 220000, max: 280000 },
  }
  return ranges[seniority] || { min: 100000, max: 140000 }
}

/**
 * Generate equity range
 */
function generateEquity(seniority: string): string {
  const ranges: Record<string, string> = {
    Junior: '0.05%-0.15%',
    'Mid-Level': '0.1%-0.3%',
    Senior: '0.25%-0.75%',
    Staff: '0.5%-1.5%',
    Principal: '1.0%-2.5%',
  }
  return ranges[seniority] || '0.1%-0.5%'
}

/**
 * Generate reports-to
 */
function generateReportsTo(department: string, seniority: string): string {
  if (department === 'Engineering') {
    if (seniority === 'Principal' || seniority === 'Staff') return 'CTO'
    return 'Head of Engineering'
  }
  if (department === 'Product') return 'Head of Product'
  if (department === 'Design') return 'Head of Design'
  if (department === 'Data') return 'Head of Data'
  return 'Department Lead'
}

/**
 * Generate "About" section
 */
function generateAbout(classification: RoleClassification, features: CodebaseFeatures): string {
  const { role, seniority } = classification
  const techStack = classification.techStack.join(', ')

  const templates: Record<string, string[]> = {
    'Frontend Engineer': [
      `We're looking for a ${seniority} Frontend Engineer to help build and scale our user-facing applications. You'll work with ${techStack} to create responsive, accessible, and performant web experiences.`,
      `Our codebase includes ${features.codeStructure.componentCount}+ React components and serves thousands of users daily. We're committed to building a product that's both powerful and delightful to use.`,
      `You'll collaborate closely with designers, product managers, and backend engineers to ship features that directly impact user experience and business metrics.`,
    ],
    'Backend Engineer': [
      `We're hiring a ${seniority} Backend Engineer to build robust, scalable APIs and services. You'll work with ${techStack} to power our growing platform.`,
      `Our backend handles ${features.codeStructure.apiRouteCount}+ API routes and integrates with ${features.techStack.databases.join(', ')}. We're focused on building reliable, performant systems that scale.`,
      `You'll own critical infrastructure, design data models, optimize queries, and ensure our systems can handle increasing load while maintaining low latency.`,
    ],
    'Full-Stack Engineer': [
      `We're seeking a ${seniority} Full-Stack Engineer who can move seamlessly between frontend and backend. You'll work with ${techStack} across our entire stack.`,
      `Our application includes ${features.codeStructure.componentCount}+ components on the frontend and ${features.codeStructure.apiRouteCount}+ API routes on the backend. We value engineers who can see the big picture.`,
      `You'll ship complete features end-to-end, from database design to UI polish, working across the full development lifecycle.`,
    ],
    'Machine Learning Engineer': [
      `We're looking for a ${seniority} Machine Learning Engineer to build and deploy ML-powered features. You'll work with ${techStack} to bring AI capabilities to production.`,
      `We're actively integrating AI/ML into our platform, with ${features.techStack.aiTools.join(', ')} already in use. This is a chance to shape our ML infrastructure from the ground up.`,
      `You'll design ML systems, train models, optimize inference performance, and work closely with product teams to identify high-impact ML opportunities.`,
    ],
    'DevOps Engineer': [
      `We're hiring a ${seniority} DevOps Engineer to build and maintain our infrastructure, CI/CD pipelines, and deployment systems.`,
      `Our architecture includes ${features.codeStructure.totalFiles}+ files across multiple services. We need automation and reliability expertise to scale our operations.`,
      `You'll own infrastructure as code, monitoring, incident response, and performance optimization across our entire stack.`,
    ],
    'Mobile Engineer': [
      `We're seeking a ${seniority} Mobile Engineer to build our mobile applications. You'll work with ${techStack} to create native-quality mobile experiences.`,
      `We're building cross-platform mobile apps that integrate deeply with our web platform. You'll own the mobile development lifecycle from architecture to app store deployment.`,
      `You'll collaborate with designers and backend engineers to deliver features that work seamlessly across iOS and Android.`,
    ],
    'QA Engineer': [
      `We're looking for a ${seniority} QA Engineer to establish testing standards and improve our test coverage. You'll work with ${techStack} to ensure product quality.`,
      `Our current test coverage is ${features.codeStructure.testCoverage.toFixed(0)}% and we're committed to improving it. We need someone who can build comprehensive testing strategies.`,
      `You'll design test plans, write automated tests, perform manual testing, and work with engineers to catch bugs before they reach production.`,
    ],
  }

  const template = templates[role] || templates['Full-Stack Engineer']
  return template.join('\n\n')
}

/**
 * Generate "Why Critical" section
 */
function generateWhyCritical(classification: RoleClassification, features: CodebaseFeatures): string {
  const { role, priority } = classification
  const reasoning = classification.reasoning.join('. ') + '.'

  let urgency = ''
  if (priority === 'critical') {
    urgency = 'This is a critical hire - we need to move fast to keep up with our growth.'
  } else if (priority === 'high') {
    urgency = 'This is a high-priority role that will accelerate our development velocity.'
  } else {
    urgency = 'This role will strengthen our engineering team and improve our product quality.'
  }

  return `${reasoning}\n\n${urgency}\n\nOur commit velocity is ${features.activity.commitVelocity.toFixed(1)} commits per week and we're actively developing across ${features.activity.activeAreas.join(', ')}. We need talented engineers who can contribute from day one.`
}

/**
 * Generate responsibilities
 */
function generateResponsibilities(
  classification: RoleClassification,
  features: CodebaseFeatures
): string[] {
  const { role } = classification

  const responsibilities: Record<string, string[]> = {
    'Frontend Engineer': [
      `Build and maintain React components using TypeScript and ${classification.techStack.includes('Tailwind CSS') ? 'Tailwind CSS' : 'modern CSS'}`,
      'Collaborate with designers to implement pixel-perfect UIs',
      'Optimize frontend performance and ensure accessibility compliance',
      'Write unit and integration tests for frontend code',
      'Participate in code reviews and contribute to engineering best practices',
      'Debug production issues and improve application reliability',
      'Work with backend engineers to design and consume APIs',
    ],
    'Backend Engineer': [
      `Design and implement RESTful APIs using ${classification.techStack.join(' and ')}`,
      `Optimize database queries and schema design in ${features.techStack.databases.join(' and ')}`,
      'Build scalable, maintainable backend services',
      'Write comprehensive tests for backend logic',
      'Monitor production systems and respond to incidents',
      'Participate in architecture decisions and code reviews',
      'Ensure security best practices across backend systems',
    ],
    'Full-Stack Engineer': [
      'Own features end-to-end from database to UI',
      `Build frontend components with ${classification.techStack.filter(t => ['React', 'Next.js'].includes(t)).join(' and ')}`,
      `Develop backend APIs and services with ${classification.techStack.filter(t => features.techStack.databases.includes(t)).join(' and ')}`,
      'Make architectural decisions that balance frontend and backend concerns',
      'Write tests across the full stack',
      'Debug issues anywhere in the application',
      'Collaborate with product and design on feature scope and implementation',
    ],
    'Machine Learning Engineer': [
      `Integrate and optimize ${features.techStack.aiTools.join(', ')} in production`,
      'Design and implement ML-powered features',
      'Build data pipelines for model training and inference',
      'Monitor model performance and retrain as needed',
      'Collaborate with product teams to identify ML opportunities',
      'Optimize inference latency and cost',
      'Ensure ML models are tested, versioned, and documented',
    ],
    'DevOps Engineer': [
      'Build and maintain CI/CD pipelines',
      'Manage infrastructure as code',
      'Monitor system health and respond to incidents',
      'Optimize deployment processes and reduce downtime',
      'Implement security best practices across infrastructure',
      'Collaborate with engineers to improve developer experience',
      'Plan capacity and scale infrastructure to meet demand',
    ],
    'Mobile Engineer': [
      `Build and maintain mobile apps using ${classification.techStack.join(' and ')}`,
      'Ensure consistent UX across iOS and Android',
      'Optimize app performance and battery usage',
      'Integrate with backend APIs and handle offline scenarios',
      'Publish updates to App Store and Google Play',
      'Debug platform-specific issues',
      'Write tests for mobile code',
    ],
    'QA Engineer': [
      `Expand test coverage using ${features.techStack.testingFrameworks.join(' and ')}`,
      'Design comprehensive test plans for new features',
      'Write and maintain automated tests',
      'Perform manual testing for critical user flows',
      'Identify and document bugs',
      'Work with engineers to improve testability',
      'Establish QA processes and best practices',
    ],
  }

  return responsibilities[role] || responsibilities['Full-Stack Engineer']
}

/**
 * Generate required qualifications
 */
function generateQualifications(
  classification: RoleClassification,
  features: CodebaseFeatures
): string[] {
  const { role, seniority } = classification
  const yearsExp = {
    Junior: '1-2',
    'Mid-Level': '3-5',
    Senior: '5-8',
    Staff: '8-12',
    Principal: '12+',
  }[seniority]

  const base = [
    `${yearsExp} years of professional software engineering experience`,
    `Strong proficiency in ${classification.techStack.slice(0, 3).join(', ')}`,
  ]

  const roleSpecific: Record<string, string[]> = {
    'Frontend Engineer': [
      'Expert knowledge of React, TypeScript, and modern frontend tooling',
      'Experience building responsive, accessible web applications',
      'Understanding of web performance optimization techniques',
      'Experience with state management and component architecture',
    ],
    'Backend Engineer': [
      'Strong experience with API design and RESTful principles',
      `Proficiency with ${features.techStack.databases[0] || 'SQL/NoSQL databases'}`,
      'Understanding of authentication, authorization, and security',
      'Experience with server-side architecture and scalability',
    ],
    'Full-Stack Engineer': [
      'Experience across frontend and backend technologies',
      'Ability to make architectural decisions that span the stack',
      'Strong understanding of web application lifecycle',
      'Experience shipping features end-to-end',
    ],
    'Machine Learning Engineer': [
      `Experience deploying ML models with ${features.techStack.aiTools[0] || 'ML frameworks'}`,
      'Understanding of ML model training, evaluation, and deployment',
      'Experience with data pipelines and feature engineering',
      'Strong Python or similar ML language proficiency',
    ],
    'DevOps Engineer': [
      'Experience with CI/CD tools and practices',
      'Strong knowledge of cloud infrastructure (AWS, GCP, or Azure)',
      'Experience with containerization (Docker, Kubernetes)',
      'Understanding of monitoring and observability',
    ],
    'Mobile Engineer': [
      'Experience building production mobile applications',
      'Understanding of mobile UI/UX patterns',
      'Experience with mobile app deployment and distribution',
      'Knowledge of mobile performance optimization',
    ],
    'QA Engineer': [
      `Experience with ${features.techStack.testingFrameworks[0] || 'automated testing frameworks'}`,
      'Strong understanding of testing methodologies',
      'Experience designing test plans and test cases',
      'Ability to identify edge cases and potential bugs',
    ],
  }

  return [...base, ...(roleSpecific[role] || roleSpecific['Full-Stack Engineer'])]
}

/**
 * Generate nice-to-have qualifications
 */
function generateNiceToHave(
  classification: RoleClassification,
  features: CodebaseFeatures
): string[] {
  const { role } = classification

  const niceToHave: Record<string, string[]> = {
    'Frontend Engineer': [
      'Experience with Next.js and server-side rendering',
      'Knowledge of web accessibility standards (WCAG)',
      'Experience with design systems and component libraries',
      'Understanding of SEO best practices',
    ],
    'Backend Engineer': [
      'Experience with microservices architecture',
      'Knowledge of caching strategies (Redis, etc.)',
      'Experience with GraphQL',
      'Understanding of event-driven architectures',
    ],
    'Full-Stack Engineer': [
      'Experience with mobile development',
      'Knowledge of cloud infrastructure',
      'Experience with real-time features (WebSockets, etc.)',
      'Understanding of DevOps practices',
    ],
    'Machine Learning Engineer': [
      'Experience with model optimization and quantization',
      'Knowledge of MLOps practices',
      'Experience with distributed training',
      'Publications or contributions to ML community',
    ],
    'DevOps Engineer': [
      'Experience with infrastructure as code (Terraform, Pulumi)',
      'Knowledge of security best practices',
      'Experience with cost optimization',
      'Understanding of compliance requirements (SOC2, HIPAA)',
    ],
    'Mobile Engineer': [
      'Experience with native iOS or Android development',
      'Knowledge of mobile CI/CD',
      'Experience with app analytics and crash reporting',
      'Understanding of mobile security',
    ],
    'QA Engineer': [
      'Experience with performance testing',
      'Knowledge of security testing',
      'Experience with API testing',
      'Understanding of test-driven development (TDD)',
    ],
  }

  return niceToHave[role] || niceToHave['Full-Stack Engineer']
}

/**
 * Generate success metrics
 */
function generateSuccessMetrics(classification: RoleClassification): JobSuccessMetrics {
  const { role } = classification

  const metrics: Record<string, JobSuccessMetrics> = {
    'Frontend Engineer': {
      month1: [
        'Complete onboarding and local development setup',
        'Ship first frontend component or bug fix',
        'Participate in team code reviews',
      ],
      month2: [
        'Ship first complete feature independently',
        'Improve frontend performance metrics',
        'Contribute to component library or design system',
      ],
      month3: [
        'Own a major UI feature from design to deployment',
        'Mentor other engineers on frontend best practices',
        'Identify and fix accessibility or performance issues',
      ],
    },
    'Backend Engineer': {
      month1: [
        'Complete onboarding and understand system architecture',
        'Ship first API endpoint or backend improvement',
        'Participate in on-call rotation',
      ],
      month2: [
        'Design and ship complete backend feature',
        'Optimize database queries or API performance',
        'Contribute to backend documentation',
      ],
      month3: [
        'Own critical backend service or API domain',
        'Lead architecture discussions for new features',
        'Improve system reliability or scalability',
      ],
    },
    'Full-Stack Engineer': {
      month1: [
        'Ship first end-to-end feature',
        'Understand frontend and backend architecture',
        'Participate in team planning and code reviews',
      ],
      month2: [
        'Own medium-sized feature across full stack',
        'Make architectural improvements',
        'Contribute to both frontend and backend codebases',
      ],
      month3: [
        'Lead design and implementation of major feature',
        'Mentor engineers on full-stack development',
        'Identify and resolve cross-stack issues',
      ],
    },
    'Machine Learning Engineer': {
      month1: [
        'Understand ML infrastructure and deployment pipeline',
        'Ship first ML model improvement or experiment',
        'Set up local ML development environment',
      ],
      month2: [
        'Deploy new ML model or feature to production',
        'Optimize model performance or latency',
        'Contribute to ML monitoring and observability',
      ],
      month3: [
        'Own ML feature from research to production',
        'Improve ML infrastructure or tooling',
        'Share ML knowledge with broader team',
      ],
    },
    'DevOps Engineer': {
      month1: [
        'Understand infrastructure and deployment processes',
        'Improve CI/CD pipeline or automation',
        'Participate in incident response',
      ],
      month2: [
        'Own infrastructure project or improvement',
        'Reduce deployment time or improve reliability',
        'Implement monitoring or alerting improvements',
      ],
      month3: [
        'Lead infrastructure architecture decisions',
        'Improve developer experience significantly',
        'Reduce infrastructure costs or improve performance',
      ],
    },
    'Mobile Engineer': {
      month1: [
        'Complete mobile development setup',
        'Ship first mobile feature or bug fix',
        'Understand mobile app architecture',
      ],
      month2: [
        'Own complete mobile feature independently',
        'Improve app performance or UX',
        'Contribute to mobile testing strategy',
      ],
      month3: [
        'Lead mobile app release cycle',
        'Architect new mobile features',
        'Mentor team on mobile best practices',
      ],
    },
    'QA Engineer': {
      month1: [
        'Understand testing infrastructure and processes',
        'Write first automated tests',
        'Identify and document critical bugs',
      ],
      month2: [
        'Increase test coverage by 10%+',
        'Design test plan for major feature',
        'Improve testing documentation',
      ],
      month3: [
        'Own QA strategy for product area',
        'Reduce bug escape rate',
        'Establish new testing practices',
      ],
    },
  }

  return metrics[role] || metrics['Full-Stack Engineer']
}

/**
 * Generate "Why Join" section
 */
function generateWhyJoin(): string[] {
  return [
    'Work on challenging technical problems with real user impact',
    'Competitive compensation including equity in a growing company',
    'Fully remote - work from anywhere in US, Canada, or EU',
    'Strong engineering culture focused on code quality and continuous learning',
    'Opportunity to shape architecture and technical direction',
    'Collaborative team environment with regular knowledge sharing',
    'Comprehensive benefits including health insurance and unlimited PTO',
    'Professional development budget for courses, conferences, and books',
  ]
}
