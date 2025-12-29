/**
 * Requirements Generator
 * Pattern matching + knowledge base to generate job requirements
 *
 * NO EXTERNAL APIs - Uses knowledge base mappings
 */

import { TECH_TO_SKILLS_MAP, DOMAIN_TERMS } from './knowledge-base'
import type {
  CodebaseFeatures,
  RoleClassification,
  JobRequirements,
  ExperienceRequirement
} from './types'

/**
 * Generate job requirements from features and classification
 */
export function generateRequirements(
  features: CodebaseFeatures,
  classification: RoleClassification
): JobRequirements {
  const { techStack, domain, complexity } = features
  const { primaryRole, seniority } = classification

  // Required skills
  const required = generateRequiredSkills(techStack, primaryRole.category, domain)

  // Preferred skills
  const preferred = generatePreferredSkills(techStack, primaryRole.category)

  // Education requirements
  const education = generateEducationRequirements(primaryRole.category, seniority)

  // Experience requirements
  const experience = generateExperienceRequirements(
    primaryRole.category,
    seniority,
    techStack,
    complexity
  )

  // Certifications (if applicable)
  const certifications = generateCertifications(primaryRole.category, domain)

  return {
    required,
    preferred,
    education,
    experience,
    certifications
  }
}

/**
 * Generate required skills
 */
function generateRequiredSkills(
  techStack: any,
  roleCategory: string,
  domain: string
): string[] {
  const skills = new Set<string>()

  // Add core technologies from tech stack
  techStack.allTechnologies.forEach((tech: string) => {
    const normalizedTech = tech.toLowerCase().replace(/^@[\w-]+\//, '')
    const techInfo = TECH_TO_SKILLS_MAP[normalizedTech] || TECH_TO_SKILLS_MAP[tech]

    if (techInfo) {
      techInfo.required.forEach(skill => skills.add(skill))
    }
  })

  // Add role-specific must-haves
  const roleCoreSkills: Record<string, string[]> = {
    frontend: [
      'Proficiency in JavaScript/TypeScript',
      'Experience with modern frontend frameworks (React, Vue, or Angular)',
      'Strong understanding of HTML5, CSS3, and responsive design',
      'Knowledge of browser APIs and web standards',
      'Experience with component-based architecture'
    ],
    backend: [
      'Strong programming skills in one or more backend languages',
      'Experience designing and building RESTful APIs',
      'Database design and optimization (SQL or NoSQL)',
      'Understanding of authentication and authorization',
      'Experience with API security best practices'
    ],
    fullstack: [
      'Full-stack development experience (frontend + backend)',
      'Proficiency in JavaScript/TypeScript',
      'Experience with modern web frameworks',
      'Database design and API development',
      'Strong problem-solving skills across the stack'
    ],
    ml: [
      'Strong foundation in machine learning and statistics',
      'Experience with ML frameworks (TensorFlow, PyTorch, or similar)',
      'Programming proficiency in Python',
      'Understanding of model training, evaluation, and deployment',
      'Experience with data preprocessing and feature engineering'
    ],
    data: [
      'Strong analytical and statistical skills',
      'Proficiency in Python or R for data analysis',
      'Experience with data visualization tools',
      'SQL and database querying expertise',
      'Ability to communicate insights to non-technical stakeholders'
    ],
    devops: [
      'Experience with cloud platforms (AWS, GCP, or Azure)',
      'Strong understanding of CI/CD pipelines',
      'Infrastructure as Code (Terraform, CloudFormation, etc.)',
      'Container orchestration (Docker, Kubernetes)',
      'Linux/Unix system administration'
    ],
    mobile: [
      'Experience building native or cross-platform mobile apps',
      'Understanding of mobile UI/UX patterns',
      'Knowledge of mobile app lifecycle and deployment',
      'Experience with mobile-specific APIs and sensors',
      'App store submission and release management'
    ],
    security: [
      'Strong understanding of security principles and best practices',
      'Experience with security testing and vulnerability assessment',
      'Knowledge of common security threats (OWASP Top 10)',
      'Experience with security tools and frameworks',
      'Understanding of compliance requirements (SOC 2, HIPAA, etc.)'
    ]
  }

  const coreSkills = roleCoreSkills[roleCategory] || []
  coreSkills.forEach(skill => skills.add(skill))

  // Add domain-specific requirements
  if (domain === 'healthtech') {
    skills.add('Understanding of healthcare data privacy (HIPAA)')
    skills.add('Experience with secure PHI handling')
  } else if (domain === 'fintech') {
    skills.add('Knowledge of financial regulations and compliance')
    skills.add('Experience with secure payment processing')
  }

  return Array.from(skills).slice(0, 8) // Limit to top 8
}

/**
 * Generate preferred (nice-to-have) skills
 */
function generatePreferredSkills(techStack: any, roleCategory: string): string[] {
  const skills = new Set<string>()

  // Add preferred skills from tech stack
  techStack.allTechnologies.forEach((tech: string) => {
    const normalizedTech = tech.toLowerCase().replace(/^@[\w-]+\//, '')
    const techInfo = TECH_TO_SKILLS_MAP[normalizedTech] || TECH_TO_SKILLS_MAP[tech]

    if (techInfo) {
      techInfo.preferred.forEach(skill => skills.add(skill))
    }
  })

  // Add general role preferences
  const rolePreferences: Record<string, string[]> = {
    frontend: [
      'Experience with state management libraries',
      'Knowledge of web performance optimization',
      'Familiarity with design systems',
      'Experience with testing frameworks (Jest, Playwright)',
      'Understanding of web accessibility (WCAG)'
    ],
    backend: [
      'Experience with microservices architecture',
      'Knowledge of message queues and event-driven systems',
      'Performance optimization and profiling',
      'Experience with monitoring and observability tools',
      'Familiarity with caching strategies'
    ],
    fullstack: [
      'Experience with both SQL and NoSQL databases',
      'Knowledge of CI/CD pipelines',
      'Cloud platform experience',
      'Performance optimization across the stack',
      'Experience mentoring junior developers'
    ],
    ml: [
      'Experience with MLOps and model deployment',
      'Knowledge of distributed training',
      'Familiarity with model optimization techniques',
      'Experience with experiment tracking tools',
      'Understanding of ethical AI and bias mitigation'
    ],
    data: [
      'Experience with big data technologies (Spark, Hadoop)',
      'Knowledge of data engineering pipelines',
      'Advanced statistical modeling',
      'Experience with A/B testing frameworks',
      'Machine learning fundamentals'
    ],
    devops: [
      'Experience with service mesh technologies',
      'Knowledge of GitOps practices',
      'Security automation expertise',
      'Cost optimization experience',
      'Multi-cloud architecture experience'
    ],
    mobile: [
      'Experience with both iOS and Android development',
      'Knowledge of mobile performance optimization',
      'Experience with offline-first architecture',
      'Familiarity with mobile analytics',
      'Understanding of mobile security best practices'
    ],
    security: [
      'Security certifications (CISSP, CEH, etc.)',
      'Experience with penetration testing',
      'Knowledge of secure coding practices',
      'Incident response experience',
      'Threat modeling expertise'
    ]
  }

  const preferences = rolePreferences[roleCategory] || []
  preferences.forEach(skill => skills.add(skill))

  return Array.from(skills).slice(0, 6) // Limit to top 6
}

/**
 * Generate education requirements
 */
function generateEducationRequirements(roleCategory: string, seniority: string): string[] {
  const requirements: string[] = []

  // Base education requirement
  if (roleCategory === 'ml' || roleCategory === 'data') {
    requirements.push("Bachelor's degree in Computer Science, Statistics, Mathematics, or related field")

    if (seniority.includes('Senior') || seniority.includes('Staff') || seniority.includes('Principal')) {
      requirements.push("Master's or PhD in relevant field preferred")
    }
  } else {
    requirements.push("Bachelor's degree in Computer Science, Engineering, or related field, OR equivalent practical experience")
  }

  // Experience can substitute for formal education
  if (!seniority.includes('Junior')) {
    requirements.push('Equivalent work experience will be considered in lieu of formal education')
  }

  return requirements
}

/**
 * Generate experience requirements
 */
function generateExperienceRequirements(
  roleCategory: string,
  seniority: string,
  techStack: any,
  complexity: any
): ExperienceRequirement[] {
  const requirements: ExperienceRequirement[] = []

  // Overall experience based on seniority
  const yearMap: Record<string, string> = {
    'Junior (1-3 years)': '1-3 years',
    'Mid-Level (3-5 years)': '3-5 years',
    'Senior (5-8 years)': '5-8 years',
    'Staff (8-12 years)': '8-12 years',
    'Principal (12+ years)': '12+ years'
  }

  const years = yearMap[seniority] || '3-5 years'

  requirements.push({
    area: `Professional software development`,
    years,
    importance: 'required'
  })

  // Role-specific experience
  const roleExperience: Record<string, ExperienceRequirement[]> = {
    frontend: [
      {
        area: 'Building production web applications with modern frameworks',
        years: extractMinYears(years),
        importance: 'required'
      },
      {
        area: 'Responsive design and cross-browser compatibility',
        years: extractMinYears(years, -1),
        importance: 'required'
      }
    ],
    backend: [
      {
        area: 'Designing and implementing scalable backend services',
        years: extractMinYears(years),
        importance: 'required'
      },
      {
        area: 'Database design and optimization',
        years: extractMinYears(years, -1),
        importance: 'required'
      }
    ],
    fullstack: [
      {
        area: 'Full-stack development across frontend and backend',
        years: extractMinYears(years),
        importance: 'required'
      }
    ],
    ml: [
      {
        area: 'Machine learning model development and deployment',
        years: extractMinYears(years),
        importance: 'required'
      },
      {
        area: 'Production ML systems at scale',
        years: extractMinYears(years, -2),
        importance: 'preferred'
      }
    ],
    data: [
      {
        area: 'Data analysis and statistical modeling',
        years: extractMinYears(years),
        importance: 'required'
      }
    ],
    devops: [
      {
        area: 'DevOps practices and infrastructure automation',
        years: extractMinYears(years),
        importance: 'required'
      },
      {
        area: 'Cloud platform administration',
        years: extractMinYears(years, -1),
        importance: 'required'
      }
    ],
    mobile: [
      {
        area: 'Mobile application development',
        years: extractMinYears(years),
        importance: 'required'
      }
    ],
    security: [
      {
        area: 'Security engineering and risk assessment',
        years: extractMinYears(years),
        importance: 'required'
      }
    ]
  }

  const specificRequirements = roleExperience[roleCategory] || []
  requirements.push(...specificRequirements)

  // Add tech-specific experience if applicable
  if (techStack.mlTools.length > 0 && roleCategory !== 'ml') {
    requirements.push({
      area: 'Working with AI/ML systems and APIs',
      years: '1+ years',
      importance: 'preferred'
    })
  }

  if (complexity.architectureComplexity === 'very_high' || complexity.architectureComplexity === 'high') {
    requirements.push({
      area: 'Large-scale distributed systems',
      years: '2+ years',
      importance: 'preferred'
    })
  }

  return requirements
}

/**
 * Generate certification requirements (if applicable)
 */
function generateCertifications(roleCategory: string, domain: string): string[] {
  const certifications: string[] = []

  if (roleCategory === 'security') {
    certifications.push('CISSP, CEH, or similar security certification preferred')
  }

  if (roleCategory === 'devops') {
    certifications.push('AWS Certified Solutions Architect, GCP Professional Cloud Architect, or equivalent preferred')
  }

  if (domain === 'healthtech' && (roleCategory === 'backend' || roleCategory === 'fullstack' || roleCategory === 'security')) {
    certifications.push('HIPAA compliance training and certification a plus')
  }

  return certifications
}

/**
 * Extract minimum years from range (e.g., "3-5 years" -> "3+ years")
 */
function extractMinYears(range: string, adjustment: number = 0): string {
  const match = range.match(/(\d+)/)
  if (match) {
    const years = Math.max(1, parseInt(match[1]) + adjustment)
    return `${years}+ years`
  }
  return '2+ years'
}
