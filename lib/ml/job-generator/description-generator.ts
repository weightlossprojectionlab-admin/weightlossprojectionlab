/**
 * Description Generator
 * Template engine with dynamic content injection
 *
 * NO EXTERNAL APIs - Pure template-based generation
 */

import { ROLE_RESPONSIBILITIES, DOMAIN_TERMS } from './knowledge-base'
import type {
  CodebaseFeatures,
  RoleClassification,
  JobRequirements,
  GeneratedJobDescription
} from './types'

/**
 * Generate complete job description
 */
export function generateJobDescription(
  classification: RoleClassification,
  features: CodebaseFeatures,
  requirements: JobRequirements
): GeneratedJobDescription {
  const { primaryRole, seniority } = classification
  const { domain, techStack } = features

  // Generate title
  const title = generateTitle(primaryRole.title, seniority, domain)

  // Generate summary
  const summary = generateSummary(primaryRole.category, seniority, techStack, domain)

  // Generate about section
  const about = generateAbout(primaryRole.category, domain, techStack, features)

  // Generate why critical
  const whyCritical = generateWhyCritical(primaryRole.category, features, classification)

  // Generate responsibilities
  const responsibilities = generateResponsibilities(primaryRole.category, techStack, domain)

  // Generate success metrics
  const successMetrics = generateSuccessMetrics(primaryRole.category, seniority)

  // Generate why join
  const whyJoin = generateWhyJoin(domain, techStack, features)

  // Generate challenges
  const challenges = generateChallenges(primaryRole.category, features)

  return {
    title,
    summary,
    about,
    whyCritical,
    responsibilities,
    successMetrics,
    whyJoin,
    challenges
  }
}

/**
 * Generate job title
 */
function generateTitle(
  baseTitle: string,
  seniority: string,
  domain: string
): string {
  // Extract seniority level
  const seniorityLevel = seniority.split(' ')[0] // "Senior", "Mid-Level", etc.

  // Add seniority prefix if not already in title
  let title = baseTitle.includes(seniorityLevel) ? baseTitle : `${seniorityLevel} ${baseTitle}`

  // Add domain suffix for specialized roles
  if (domain === 'healthtech' && (baseTitle.includes('Backend') || baseTitle.includes('Full-Stack'))) {
    title = `${title} - Healthcare Platform`
  }

  return title
}

/**
 * Generate one-sentence summary
 */
function generateSummary(
  roleCategory: string,
  seniority: string,
  techStack: any,
  domain: string
): string {
  const summaries: Record<string, string> = {
    frontend: `Build exceptional user experiences using ${extractMainTechs(techStack, ['react', 'next.js', 'vue', 'typescript'])} for our ${domain} platform`,
    backend: `Design and scale backend services and APIs using ${extractMainTechs(techStack, ['node', 'python', 'go', 'firebase'])} to power our ${domain} infrastructure`,
    fullstack: `Ship features across the entire stack using ${extractMainTechs(techStack, ['next.js', 'react', 'typescript', 'firebase'])} to deliver end-to-end value`,
    ml: `Build and deploy machine learning systems using ${extractMainTechs(techStack, ['tensorflow', 'pytorch', 'openai', 'anthropic'])} to power intelligent features`,
    data: `Extract insights from complex datasets using ${extractMainTechs(techStack, ['python', 'sql', 'pandas'])} to drive data-informed decisions`,
    devops: `Build and maintain scalable infrastructure using ${extractMainTechs(techStack, ['kubernetes', 'terraform', 'aws', 'gcp'])} for high-availability systems`,
    mobile: `Create native mobile experiences using ${extractMainTechs(techStack, ['react-native', 'capacitor', 'ios', 'android'])} for our mobile-first users`,
    security: `Secure our ${domain} platform and protect sensitive data through comprehensive security engineering and compliance`
  }

  return summaries[roleCategory] || `Join our engineering team to build innovative ${domain} solutions`
}

/**
 * Generate about section (2-3 paragraphs)
 */
function generateAbout(
  roleCategory: string,
  domain: string,
  techStack: any,
  features: CodebaseFeatures
): string {
  const paragraphs: string[] = []

  // Paragraph 1: Role overview
  const roleOverviews: Record<string, string> = {
    frontend: `As a Frontend Engineer, you'll be at the forefront of creating beautiful, performant user interfaces that delight our users. You'll work closely with designers and backend engineers to build features that are both visually stunning and technically excellent. Your work will directly impact how thousands of users interact with our platform every day.`,

    backend: `As a Backend Engineer, you'll design and build the robust services and APIs that power our platform. You'll work on challenging problems around data modeling, API design, performance optimization, and system reliability. Your code will process thousands of requests per minute and handle sensitive ${domain} data with the highest standards of security and compliance.`,

    fullstack: `As a Full-Stack Engineer, you'll own features from database to UI, shipping complete solutions that deliver real value to users. You'll have the autonomy to make architectural decisions and the responsibility to ensure your features are performant, accessible, and maintainable. This role is perfect for engineers who love seeing their work come to life across the entire stack.`,

    ml: `As a Machine Learning Engineer, you'll build intelligent systems that make our platform smarter and more helpful. You'll work on everything from data pipelines to model training to production deployment, collaborating with engineers and domain experts to identify opportunities where ML can drive impact. Your models will process real user data and deliver insights that improve health outcomes.`,

    data: `As a Data Scientist, you'll turn complex data into actionable insights that drive product and business decisions. You'll build dashboards, run experiments, develop predictive models, and communicate findings to both technical and non-technical stakeholders. Your work will directly influence our product roadmap and help us better serve our users.`,

    devops: `As a DevOps Engineer, you'll build and maintain the infrastructure that keeps our platform running smoothly 24/7. You'll design CI/CD pipelines, implement monitoring and alerting, optimize costs, and ensure our systems are secure, reliable, and scalable. You'll empower the entire engineering team to ship faster and with confidence.`,

    mobile: `As a Mobile Engineer, you'll create native mobile experiences that bring our platform to users wherever they are. You'll build features that leverage device capabilities, work offline, sync seamlessly, and feel fast and responsive. Your apps will be used daily by thousands of users who depend on them for their health and wellness.`,

    security: `As a Security Engineer, you'll be responsible for protecting our platform and our users' sensitive data. You'll conduct security audits, implement security controls, monitor for threats, and ensure we meet strict compliance requirements. Your work will enable the entire company to move fast while staying secure.`
  }

  paragraphs.push(roleOverviews[roleCategory] || 'Join our engineering team to build innovative solutions.')

  // Paragraph 2: Tech stack and domain
  const mainTechs = extractMainTechs(techStack, [], 5)
  const domainContext = getDomainContext(domain)

  paragraphs.push(`Our tech stack includes ${mainTechs}, and we're constantly evaluating new technologies to solve problems more effectively. ${domainContext} We value engineers who are pragmatic, thoughtful, and focused on delivering real value to users.`)

  // Paragraph 3: Team and culture
  const complexityNote = features.complexity.architectureComplexity === 'very_high' || features.complexity.architectureComplexity === 'high'
    ? 'You\'ll work on technically challenging problems at scale, with opportunities to make architectural decisions that shape our platform for years to come.'
    : 'You\'ll have autonomy to own features end-to-end and make decisions about how to best solve problems.'

  paragraphs.push(`You'll collaborate with a talented team of engineers, designers, and product managers who are passionate about building great products. ${complexityNote} We're a remote-first company with team members across the US, Canada, and EU.`)

  return paragraphs.join('\n\n')
}

/**
 * Generate why this role is critical
 */
function generateWhyCritical(
  roleCategory: string,
  features: CodebaseFeatures,
  classification: RoleClassification
): string {
  const { commitPatterns, complexity, skillGaps } = features
  const { reasoning } = classification

  const whyCritical: Record<string, string> = {
    frontend: `Our platform is experiencing rapid growth, and we need to scale our frontend capabilities to meet demand. Recent development shows ${commitPatterns.recentActivity} activity in UI development, and we're building features that require ${complexity.architectureComplexity} frontend expertise. This role is critical to maintaining our product velocity and ensuring exceptional user experiences.`,

    backend: `We're scaling our infrastructure to handle growing data volumes and user traffic. With ${commitPatterns.recentActivity} backend development activity and ${complexity.integrationPoints} integration points to manage, we need an experienced backend engineer to help us build robust, scalable services that can grow with our platform.`,

    fullstack: `As we ship new features rapidly, we need versatile engineers who can move quickly across the stack. Our codebase shows ${commitPatterns.recentActivity} development activity across frontend and backend, and this role will accelerate our ability to ship complete, polished features that delight users.`,

    ml: `AI and machine learning are core to our product strategy. With ${features.techStack.mlTools.length} ML tools already in use and growing data volumes, this role is critical to building intelligent features that differentiate our platform and deliver real value to users.`,

    data: `Data-driven decision making is essential to our success. This role will help us better understand user behavior, measure feature impact, and identify opportunities for growth. Your insights will directly influence product strategy and business outcomes.`,

    devops: `As our user base grows, infrastructure reliability and efficiency become increasingly critical. This role will help us scale our platform, reduce costs, improve deployment velocity, and maintain the highest standards of security and uptime.`,

    mobile: `Mobile is a critical channel for reaching our users. This role will help us build world-class mobile experiences that bring our platform to users wherever they are, with features that work seamlessly across devices.`,

    security: `Security and compliance are non-negotiable in ${features.domain}. This role is critical to maintaining user trust, meeting regulatory requirements, and enabling the entire company to innovate safely and responsibly.`
  }

  let critical = whyCritical[roleCategory] || 'This role is critical to our growth and success.'

  // Add specific skill gap mention if applicable
  const criticalGaps = skillGaps.filter(g => g.priority === 'critical')
  if (criticalGaps.length > 0) {
    critical += ` We've identified critical skill gaps in ${criticalGaps.map(g => g.technology).join(', ')}, and this hire will help us accelerate development in these areas.`
  }

  return critical
}

/**
 * Generate responsibilities list
 */
function generateResponsibilities(
  roleCategory: string,
  techStack: any,
  domain: string
): string[] {
  // Get base responsibilities from knowledge base
  const baseResponsibilities = ROLE_RESPONSIBILITIES[roleCategory] || []

  // Add domain-specific responsibilities
  const domainResponsibilities: string[] = []

  if (domain === 'healthtech') {
    if (roleCategory === 'backend' || roleCategory === 'fullstack' || roleCategory === 'security') {
      domainResponsibilities.push('Ensure HIPAA compliance and secure handling of Protected Health Information (PHI)')
    }
    if (roleCategory === 'frontend' || roleCategory === 'fullstack') {
      domainResponsibilities.push('Build accessible, user-friendly interfaces for diverse patient populations')
    }
  }

  // Add tech-specific responsibilities
  const techResponsibilities: string[] = []

  if (techStack.mlTools.length > 0 && roleCategory !== 'ml') {
    techResponsibilities.push('Integrate AI/ML capabilities into product features')
  }

  if (techStack.cloudServices.length > 0 && roleCategory !== 'devops') {
    techResponsibilities.push('Work with cloud infrastructure and services for scalability')
  }

  // Combine all responsibilities
  const allResponsibilities = [
    ...baseResponsibilities.slice(0, 5),
    ...domainResponsibilities,
    ...techResponsibilities
  ]

  return allResponsibilities.slice(0, 7) // Limit to 7 responsibilities
}

/**
 * Generate success metrics (30-60-90 day plan)
 */
function generateSuccessMetrics(
  roleCategory: string,
  seniority: string
): {
  month1: string[]
  month2: string[]
  month3: string[]
} {
  const isJunior = seniority.includes('Junior')
  const isSenior = seniority.includes('Senior') || seniority.includes('Staff') || seniority.includes('Principal')

  const month1Base = [
    'Complete onboarding and codebase orientation',
    'Ship first code to production',
    'Understand team workflows and development processes'
  ]

  const month2Base = [
    'Independently complete and ship features',
    'Participate actively in code reviews',
    'Contribute to technical discussions and planning'
  ]

  const month3Base = [
    'Own and deliver complex features end-to-end',
    'Mentor team members and share knowledge',
    'Identify and drive improvements to our systems and processes'
  ]

  // Adjust for seniority
  if (isJunior) {
    month1Base.push('Build relationships with team members and ask questions proactively')
    month2Base.push('Demonstrate growing independence in feature work')
    month3Base[2] = 'Contribute ideas for technical improvements'
  } else if (isSenior) {
    month1Base.push('Identify quick wins and opportunities for improvement')
    month2Base.push('Propose and drive architectural improvements')
    month3Base.push('Influence technical direction and mentor junior engineers')
  }

  // Role-specific additions
  const roleAdditions: Record<string, { month2: string; month3: string }> = {
    frontend: {
      month2: 'Improve frontend performance metrics',
      month3: 'Establish patterns and standards for component development'
    },
    backend: {
      month2: 'Optimize API performance and database queries',
      month3: 'Design and implement new service architectures'
    },
    fullstack: {
      month2: 'Ship features spanning frontend to backend',
      month3: 'Drive cross-stack improvements and optimizations'
    },
    ml: {
      month2: 'Train and deploy first ML model to production',
      month3: 'Establish MLOps practices and model monitoring'
    },
    data: {
      month2: 'Deliver first insights and dashboard to stakeholders',
      month3: 'Build reusable analytics frameworks and templates'
    },
    devops: {
      month2: 'Improve CI/CD pipeline efficiency',
      month3: 'Reduce infrastructure costs and improve reliability metrics'
    },
    mobile: {
      month2: 'Ship mobile features with high user satisfaction',
      month3: 'Improve app performance and crash-free metrics'
    },
    security: {
      month2: 'Complete first security audit and remediation',
      month3: 'Establish security monitoring and incident response processes'
    }
  }

  const additions = roleAdditions[roleCategory]
  if (additions) {
    month2Base.push(additions.month2)
    month3Base.push(additions.month3)
  }

  return {
    month1: month1Base,
    month2: month2Base,
    month3: month3Base
  }
}

/**
 * Generate why join reasons
 */
function generateWhyJoin(
  domain: string,
  techStack: any,
  features: CodebaseFeatures
): string[] {
  const reasons: string[] = []

  // Impact
  reasons.push(`Make a real impact in ${domain} - your work will improve lives and health outcomes for thousands of users`)

  // Technical growth
  const techCount = techStack.allTechnologies.length
  reasons.push(`Work with modern technologies (${techCount}+ in our stack) and solve challenging technical problems`)

  // Autonomy
  if (features.complexity.architectureComplexity === 'very_high' || features.complexity.architectureComplexity === 'high') {
    reasons.push('High autonomy to make architectural decisions and shape our technical direction')
  } else {
    reasons.push('Ownership and autonomy to make decisions about how you solve problems')
  }

  // Remote/flexible
  reasons.push('Fully remote with flexible hours - work from anywhere in the US, Canada, or EU')

  // Growth
  reasons.push('Competitive compensation with equity - grow with the company as we scale')

  // Team
  reasons.push('Collaborate with a talented, passionate team that values quality and craftsmanship')

  // Mission
  if (domain === 'healthtech') {
    reasons.push('Mission-driven company focused on improving healthcare access and outcomes')
  } else {
    reasons.push('Mission-driven company solving real problems for real users')
  }

  return reasons
}

/**
 * Generate challenges
 */
function generateChallenges(
  roleCategory: string,
  features: CodebaseFeatures
): string[] {
  const challenges: string[] = []

  const roleChallenges: Record<string, string[]> = {
    frontend: [
      'Building performant UIs that handle complex real-time data',
      'Creating accessible experiences for diverse user populations',
      'Optimizing bundle size and load times'
    ],
    backend: [
      'Scaling services to handle growing data volumes',
      'Designing APIs that are flexible yet performant',
      'Ensuring data consistency across distributed systems'
    ],
    fullstack: [
      'Balancing trade-offs between frontend and backend complexity',
      'Maintaining type safety across the stack',
      'Optimizing full request lifecycle performance'
    ],
    ml: [
      'Building ML pipelines that are robust and reproducible',
      'Deploying models that perform well in production',
      'Managing model versioning and experiment tracking'
    ],
    data: [
      'Working with large, complex datasets',
      'Balancing statistical rigor with business needs',
      'Communicating technical findings to non-technical stakeholders'
    ],
    devops: [
      'Maintaining high availability while enabling rapid deployment',
      'Balancing infrastructure costs with performance needs',
      'Securing systems while maintaining developer velocity'
    ],
    mobile: [
      'Building apps that work reliably offline',
      'Optimizing battery and data usage',
      'Supporting diverse devices and OS versions'
    ],
    security: [
      'Staying ahead of evolving security threats',
      'Balancing security requirements with user experience',
      'Meeting strict compliance requirements in healthcare'
    ]
  }

  const baseChallenges = roleChallenges[roleCategory] || []
  challenges.push(...baseChallenges)

  // Add domain-specific challenges
  if (features.domain === 'healthtech') {
    challenges.push('Ensuring HIPAA compliance without sacrificing functionality')
  }

  return challenges.slice(0, 4)
}

/**
 * Extract main technologies from tech stack
 */
function extractMainTechs(techStack: any, keywords: string[] = [], limit: number = 3): string {
  let techs: string[] = []

  if (keywords.length > 0) {
    // Filter by keywords
    techs = techStack.allTechnologies.filter((tech: string) =>
      keywords.some(keyword => tech.toLowerCase().includes(keyword))
    )
  }

  // If no matches or no keywords, use first N technologies
  if (techs.length === 0) {
    techs = techStack.allTechnologies.slice(0, limit)
  }

  techs = techs.slice(0, limit)

  if (techs.length === 0) {
    return 'modern technologies'
  }

  // Format as "A, B, and C"
  if (techs.length === 1) return techs[0]
  if (techs.length === 2) return `${techs[0]} and ${techs[1]}`
  return `${techs.slice(0, -1).join(', ')}, and ${techs[techs.length - 1]}`
}

/**
 * Get domain context
 */
function getDomainContext(domain: string): string {
  const contexts: Record<string, string> = {
    healthtech: "We're building a healthcare platform that helps people live healthier lives, and we take our responsibility to protect patient data very seriously.",
    fintech: "We're building financial technology that people trust with their money, and security and reliability are paramount.",
    ecommerce: "We're building e-commerce experiences that millions of users depend on for their shopping needs.",
    saas: "We're building a SaaS platform that businesses rely on every day."
  }

  return contexts[domain] || "We're building technology that people depend on."
}
