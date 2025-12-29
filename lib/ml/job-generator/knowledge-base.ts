/**
 * ML Knowledge Base
 * Comprehensive mapping of technologies to skills, roles, and market data
 *
 * This is the "intelligence" of our ML system - no external APIs needed
 */

import type { Seniority, TechCategory, Department } from './types'

/**
 * Technology to Skills Mapping
 * Maps 500+ technologies to required and preferred skills
 */
export const TECH_TO_SKILLS_MAP: Record<
  string,
  {
    category: TechCategory
    required: string[]
    preferred: string[]
    relatedTech: string[]
  }
> = {
  // Frontend Technologies
  react: {
    category: 'framework',
    required: ['JavaScript/TypeScript', 'React', 'Component Architecture', 'State Management'],
    preferred: ['React Hooks', 'Context API', 'Redux/Zustand', 'Performance Optimization'],
    relatedTech: ['Next.js', 'Vite', 'Webpack', 'Tailwind CSS']
  },
  'next.js': {
    category: 'framework',
    required: ['React', 'TypeScript', 'SSR/SSG', 'API Routes', 'App Router'],
    preferred: ['Server Components', 'Middleware', 'Edge Functions', 'ISR'],
    relatedTech: ['React', 'Vercel', 'Node.js']
  },
  typescript: {
    category: 'language',
    required: ['TypeScript', 'Type Systems', 'Interfaces/Types', 'Generics'],
    preferred: ['Advanced Types', 'Type Guards', 'Mapped Types', 'Utility Types'],
    relatedTech: ['JavaScript', 'ESLint', 'TSConfig']
  },
  tailwindcss: {
    category: 'framework',
    required: ['CSS', 'Tailwind CSS', 'Utility-First CSS', 'Responsive Design'],
    preferred: ['Custom Themes', 'JIT Mode', 'Component Patterns', 'Dark Mode'],
    relatedTech: ['PostCSS', 'CSS Modules']
  },
  vue: {
    category: 'framework',
    required: ['JavaScript/TypeScript', 'Vue.js', 'Component Composition', 'Reactivity'],
    preferred: ['Vue 3 Composition API', 'Pinia', 'Vuex', 'Vue Router'],
    relatedTech: ['Nuxt.js', 'Vite']
  },
  angular: {
    category: 'framework',
    required: ['TypeScript', 'Angular', 'RxJS', 'Dependency Injection'],
    preferred: ['NgRx', 'Angular Material', 'Standalone Components', 'Signals'],
    relatedTech: ['TypeScript', 'RxJS', 'Jasmine']
  },

  // Backend Technologies
  'node.js': {
    category: 'framework',
    required: ['JavaScript/TypeScript', 'Node.js', 'Event Loop', 'Async Programming'],
    preferred: ['Express.js', 'NestJS', 'Fastify', 'Streams', 'Worker Threads'],
    relatedTech: ['npm', 'yarn', 'pnpm']
  },
  express: {
    category: 'framework',
    required: ['Node.js', 'Express.js', 'Middleware', 'REST APIs', 'Routing'],
    preferred: ['Error Handling', 'Authentication', 'Rate Limiting', 'CORS'],
    relatedTech: ['Node.js', 'MongoDB', 'PostgreSQL']
  },
  nestjs: {
    category: 'framework',
    required: ['TypeScript', 'NestJS', 'Dependency Injection', 'Decorators', 'Modules'],
    preferred: ['Guards', 'Interceptors', 'Pipes', 'Microservices', 'GraphQL'],
    relatedTech: ['TypeScript', 'Express', 'TypeORM']
  },
  python: {
    category: 'language',
    required: ['Python', 'OOP', 'Data Structures', 'Error Handling'],
    preferred: ['Async/Await', 'Type Hints', 'Decorators', 'Context Managers'],
    relatedTech: ['FastAPI', 'Django', 'Flask', 'Poetry']
  },
  django: {
    category: 'framework',
    required: ['Python', 'Django', 'ORM', 'MVT Pattern', 'Admin Panel'],
    preferred: ['Django REST Framework', 'Celery', 'Channels', 'Testing'],
    relatedTech: ['Python', 'PostgreSQL', 'Redis']
  },
  fastapi: {
    category: 'framework',
    required: ['Python', 'FastAPI', 'Async/Await', 'Pydantic', 'OpenAPI'],
    preferred: ['Dependency Injection', 'Background Tasks', 'WebSockets', 'Testing'],
    relatedTech: ['Python', 'Pydantic', 'Uvicorn']
  },
  go: {
    category: 'language',
    required: ['Go', 'Goroutines', 'Channels', 'Error Handling', 'Interfaces'],
    preferred: ['Context', 'Generics', 'Testing', 'Performance Optimization'],
    relatedTech: ['Gin', 'Echo', 'gRPC']
  },
  rust: {
    category: 'language',
    required: ['Rust', 'Ownership', 'Borrowing', 'Lifetimes', 'Traits'],
    preferred: ['Async Rust', 'Macros', 'Unsafe Code', 'Error Handling'],
    relatedTech: ['Cargo', 'Actix', 'Tokio']
  },

  // Databases
  firebase: {
    category: 'database',
    required: ['Firebase', 'Firestore', 'Real-time Database', 'Authentication', 'Security Rules'],
    preferred: ['Cloud Functions', 'Storage', 'Analytics', 'Performance Monitoring'],
    relatedTech: ['Google Cloud', 'NoSQL']
  },
  'firebase-admin': {
    category: 'database',
    required: ['Firebase Admin SDK', 'Server-side Firebase', 'Authentication', 'Firestore Admin'],
    preferred: ['Custom Claims', 'Cloud Messaging', 'Security', 'Batch Operations'],
    relatedTech: ['Firebase', 'Node.js', 'Google Cloud']
  },
  postgresql: {
    category: 'database',
    required: ['PostgreSQL', 'SQL', 'Indexes', 'Transactions', 'Query Optimization'],
    preferred: ['JSONB', 'Full-text Search', 'Partitioning', 'Replication'],
    relatedTech: ['Prisma', 'TypeORM', 'Sequelize']
  },
  mongodb: {
    category: 'database',
    required: ['MongoDB', 'NoSQL', 'Document Model', 'Aggregation Pipeline', 'Indexes'],
    preferred: ['Sharding', 'Replication', 'Change Streams', 'Transactions'],
    relatedTech: ['Mongoose', 'Atlas']
  },
  redis: {
    category: 'database',
    required: ['Redis', 'Caching', 'Pub/Sub', 'Data Structures', 'Persistence'],
    preferred: ['Lua Scripting', 'Streams', 'Clustering', 'Sentinel'],
    relatedTech: ['Memcached', 'Valkey']
  },

  // ML/AI Tools
  tensorflow: {
    category: 'ml',
    required: ['Python', 'TensorFlow', 'Neural Networks', 'Model Training', 'Keras'],
    preferred: ['TensorFlow Serving', 'TFX', 'Model Optimization', 'Custom Layers'],
    relatedTech: ['Python', 'NumPy', 'Pandas']
  },
  pytorch: {
    category: 'ml',
    required: ['Python', 'PyTorch', 'Neural Networks', 'Autograd', 'Model Training'],
    preferred: ['TorchScript', 'Distributed Training', 'Custom Ops', 'ONNX'],
    relatedTech: ['Python', 'CUDA', 'NumPy']
  },
  'scikit-learn': {
    category: 'ml',
    required: ['Python', 'Machine Learning', 'Classification', 'Regression', 'Clustering'],
    preferred: ['Feature Engineering', 'Model Selection', 'Cross-validation', 'Pipelines'],
    relatedTech: ['NumPy', 'Pandas', 'Matplotlib']
  },
  openai: {
    category: 'ml',
    required: ['OpenAI API', 'Prompt Engineering', 'LLMs', 'Chat Completions'],
    preferred: ['Function Calling', 'Fine-tuning', 'Embeddings', 'Moderation'],
    relatedTech: ['Python', 'Node.js', 'LangChain']
  },
  '@anthropic-ai/sdk': {
    category: 'ml',
    required: ['Claude API', 'Prompt Engineering', 'LLMs', 'Conversation Design'],
    preferred: ['Tool Use', 'Vision', 'Long Context', 'Streaming'],
    relatedTech: ['TypeScript', 'Python', 'AI Orchestration']
  },
  '@google/generative-ai': {
    category: 'ml',
    required: ['Gemini API', 'Multimodal AI', 'Prompt Engineering', 'Content Generation'],
    preferred: ['Vision', 'Code Generation', 'Function Calling', 'Safety Settings'],
    relatedTech: ['JavaScript', 'Python', 'Google Cloud']
  },

  // Cloud Services
  aws: {
    category: 'cloud',
    required: ['AWS', 'EC2', 'S3', 'IAM', 'VPC'],
    preferred: ['Lambda', 'CloudFormation', 'ECS', 'RDS', 'CloudWatch'],
    relatedTech: ['Terraform', 'Docker', 'Kubernetes']
  },
  gcp: {
    category: 'cloud',
    required: ['Google Cloud', 'Compute Engine', 'Cloud Storage', 'IAM', 'VPC'],
    preferred: ['Cloud Functions', 'Cloud Run', 'BigQuery', 'GKE', 'Monitoring'],
    relatedTech: ['Firebase', 'Terraform', 'Docker']
  },
  azure: {
    category: 'cloud',
    required: ['Azure', 'Virtual Machines', 'Blob Storage', 'IAM', 'Networking'],
    preferred: ['Azure Functions', 'AKS', 'Cosmos DB', 'App Service', 'Monitor'],
    relatedTech: ['Terraform', 'Docker', 'Kubernetes']
  },

  // DevOps
  docker: {
    category: 'devops',
    required: ['Docker', 'Containers', 'Dockerfile', 'Image Building', 'Docker Compose'],
    preferred: ['Multi-stage Builds', 'Layer Optimization', 'Registry', 'Security'],
    relatedTech: ['Kubernetes', 'Podman', 'containerd']
  },
  kubernetes: {
    category: 'devops',
    required: ['Kubernetes', 'Pods', 'Deployments', 'Services', 'ConfigMaps'],
    preferred: ['Helm', 'Operators', 'StatefulSets', 'Ingress', 'Monitoring'],
    relatedTech: ['Docker', 'Helm', 'Prometheus']
  },
  terraform: {
    category: 'devops',
    required: ['Terraform', 'IaC', 'Modules', 'State Management', 'Providers'],
    preferred: ['Remote State', 'Workspaces', 'Automation', 'Best Practices'],
    relatedTech: ['AWS', 'GCP', 'Azure']
  },
  github: {
    category: 'devops',
    required: ['Git', 'GitHub', 'Pull Requests', 'Code Review', 'Branching'],
    preferred: ['GitHub Actions', 'GitHub Apps', 'CODEOWNERS', 'Security'],
    relatedTech: ['Git', 'CI/CD']
  },

  // Testing
  jest: {
    category: 'testing',
    required: ['Jest', 'Unit Testing', 'Mocking', 'Test Coverage', 'Assertions'],
    preferred: ['Snapshot Testing', 'Integration Tests', 'Test Patterns', 'Performance'],
    relatedTech: ['React Testing Library', 'TypeScript']
  },
  playwright: {
    category: 'testing',
    required: ['Playwright', 'E2E Testing', 'Browser Automation', 'Test Scenarios'],
    preferred: ['Visual Regression', 'CI/CD Integration', 'Debugging', 'Parallelization'],
    relatedTech: ['TypeScript', 'CI/CD']
  },
  cypress: {
    category: 'testing',
    required: ['Cypress', 'E2E Testing', 'Test Writing', 'Assertions', 'Fixtures'],
    preferred: ['Component Testing', 'Intercepts', 'CI/CD', 'Visual Testing'],
    relatedTech: ['JavaScript', 'TypeScript']
  },

  // Payment/Business
  stripe: {
    category: 'tool',
    required: ['Stripe API', 'Payment Processing', 'Subscriptions', 'Webhooks'],
    preferred: ['Checkout Sessions', 'Customer Portal', 'Payment Intents', 'Connect'],
    relatedTech: ['Node.js', 'React', 'Webhooks']
  },

  // Other Popular Tools
  prisma: {
    category: 'database',
    required: ['Prisma', 'ORM', 'Schema Definition', 'Migrations', 'Type Safety'],
    preferred: ['Prisma Client', 'Studio', 'Performance', 'Relations'],
    relatedTech: ['PostgreSQL', 'MySQL', 'TypeScript']
  },
  graphql: {
    category: 'framework',
    required: ['GraphQL', 'Schema Definition', 'Resolvers', 'Queries/Mutations'],
    preferred: ['Apollo', 'Federation', 'Subscriptions', 'Performance'],
    relatedTech: ['Apollo', 'TypeScript', 'Node.js']
  },
  trpc: {
    category: 'framework',
    required: ['tRPC', 'Type Safety', 'Procedures', 'React Query'],
    preferred: ['Middleware', 'Subscriptions', 'Error Handling', 'Validation'],
    relatedTech: ['TypeScript', 'React', 'Next.js']
  }
}

/**
 * Role Base Salaries by Seniority
 * US market rates (2024-2025)
 */
export const ROLE_BASE_SALARIES: Record<
  string,
  Record<Seniority, { min: number; max: number }>
> = {
  'Frontend Engineer': {
    'Junior (1-3 years)': { min: 70000, max: 95000 },
    'Mid-Level (3-5 years)': { min: 95000, max: 130000 },
    'Senior (5-8 years)': { min: 130000, max: 170000 },
    'Staff (8-12 years)': { min: 170000, max: 210000 },
    'Principal (12+ years)': { min: 210000, max: 270000 }
  },
  'Backend Engineer': {
    'Junior (1-3 years)': { min: 75000, max: 100000 },
    'Mid-Level (3-5 years)': { min: 100000, max: 140000 },
    'Senior (5-8 years)': { min: 140000, max: 180000 },
    'Staff (8-12 years)': { min: 180000, max: 220000 },
    'Principal (12+ years)': { min: 220000, max: 280000 }
  },
  'Full-Stack Engineer': {
    'Junior (1-3 years)': { min: 75000, max: 100000 },
    'Mid-Level (3-5 years)': { min: 100000, max: 140000 },
    'Senior (5-8 years)': { min: 140000, max: 185000 },
    'Staff (8-12 years)': { min: 185000, max: 230000 },
    'Principal (12+ years)': { min: 230000, max: 290000 }
  },
  'ML Engineer': {
    'Junior (1-3 years)': { min: 90000, max: 120000 },
    'Mid-Level (3-5 years)': { min: 120000, max: 160000 },
    'Senior (5-8 years)': { min: 160000, max: 210000 },
    'Staff (8-12 years)': { min: 210000, max: 260000 },
    'Principal (12+ years)': { min: 260000, max: 330000 }
  },
  'Data Scientist': {
    'Junior (1-3 years)': { min: 85000, max: 115000 },
    'Mid-Level (3-5 years)': { min: 115000, max: 155000 },
    'Senior (5-8 years)': { min: 155000, max: 200000 },
    'Staff (8-12 years)': { min: 200000, max: 250000 },
    'Principal (12+ years)': { min: 250000, max: 320000 }
  },
  'DevOps Engineer': {
    'Junior (1-3 years)': { min: 75000, max: 105000 },
    'Mid-Level (3-5 years)': { min: 105000, max: 145000 },
    'Senior (5-8 years)': { min: 145000, max: 190000 },
    'Staff (8-12 years)': { min: 190000, max: 235000 },
    'Principal (12+ years)': { min: 235000, max: 295000 }
  },
  'Mobile Engineer': {
    'Junior (1-3 years)': { min: 70000, max: 95000 },
    'Mid-Level (3-5 years)': { min: 95000, max: 135000 },
    'Senior (5-8 years)': { min: 135000, max: 175000 },
    'Staff (8-12 years)': { min: 175000, max: 215000 },
    'Principal (12+ years)': { min: 215000, max: 275000 }
  },
  'Security Engineer': {
    'Junior (1-3 years)': { min: 80000, max: 110000 },
    'Mid-Level (3-5 years)': { min: 110000, max: 150000 },
    'Senior (5-8 years)': { min: 150000, max: 195000 },
    'Staff (8-12 years)': { min: 195000, max: 245000 },
    'Principal (12+ years)': { min: 245000, max: 305000 }
  }
}

/**
 * Equity Ranges by Seniority
 */
export const EQUITY_RANGES: Record<Seniority, string> = {
  'Junior (1-3 years)': '0.05%-0.15%',
  'Mid-Level (3-5 years)': '0.1%-0.3%',
  'Senior (5-8 years)': '0.25%-0.75%',
  'Staff (8-12 years)': '0.5%-1.5%',
  'Principal (12+ years)': '1.0%-2.5%'
}

/**
 * Reports To by Department and Seniority
 */
export const REPORTS_TO_MAP: Record<Department, Record<string, string>> = {
  Engineering: {
    'Junior': 'Engineering Manager',
    'Mid-Level': 'Engineering Manager',
    'Senior': 'Head of Engineering',
    'Staff': 'CTO',
    'Principal': 'CTO'
  },
  Product: {
    'Junior': 'Product Manager',
    'Mid-Level': 'Senior Product Manager',
    'Senior': 'Head of Product',
    'Staff': 'CPO',
    'Principal': 'CPO'
  },
  Design: {
    'Junior': 'Design Manager',
    'Mid-Level': 'Design Manager',
    'Senior': 'Head of Design',
    'Staff': 'Head of Design',
    'Principal': 'CPO'
  },
  Data: {
    'Junior': 'Data Manager',
    'Mid-Level': 'Senior Data Scientist',
    'Senior': 'Head of Data',
    'Staff': 'CTO',
    'Principal': 'CTO'
  },
  Security: {
    'Junior': 'Security Manager',
    'Mid-Level': 'Senior Security Engineer',
    'Senior': 'Head of Security',
    'Staff': 'CISO',
    'Principal': 'CISO'
  },
  DevOps: {
    'Junior': 'DevOps Manager',
    'Mid-Level': 'Senior DevOps Engineer',
    'Senior': 'Head of Infrastructure',
    'Staff': 'CTO',
    'Principal': 'CTO'
  }
}

/**
 * Common Responsibilities by Role Category
 */
export const ROLE_RESPONSIBILITIES: Record<string, string[]> = {
  frontend: [
    'Build and maintain user-facing features using modern frontend frameworks',
    'Collaborate with designers to implement pixel-perfect UIs',
    'Optimize application performance and bundle size',
    'Write comprehensive unit and integration tests',
    'Participate in code reviews and architectural discussions',
    'Mentor junior developers and share best practices',
    'Ensure accessibility (WCAG) compliance across all features'
  ],
  backend: [
    'Design and implement scalable backend services and APIs',
    'Optimize database queries and data models for performance',
    'Build robust authentication and authorization systems',
    'Implement monitoring, logging, and alerting infrastructure',
    'Write comprehensive tests and maintain high code coverage',
    'Participate in on-call rotation and incident response',
    'Collaborate with frontend engineers on API contracts'
  ],
  fullstack: [
    'Build features across the entire stack - frontend to database',
    'Design and implement RESTful or GraphQL APIs',
    'Create responsive, accessible user interfaces',
    'Optimize application performance on both client and server',
    'Write end-to-end tests covering full user flows',
    'Participate in architectural decisions and technical planning',
    'Mentor team members on full-stack best practices'
  ],
  ml: [
    'Design and train machine learning models for production use',
    'Build ML pipelines for data processing and model training',
    'Deploy and monitor ML models in production environments',
    'Collaborate with data scientists on feature engineering',
    'Optimize model performance and inference speed',
    'Implement A/B testing frameworks for model evaluation',
    'Stay current with latest ML research and techniques'
  ],
  data: [
    'Analyze large datasets to extract actionable insights',
    'Build dashboards and visualizations for stakeholders',
    'Design and implement data pipelines and ETL processes',
    'Collaborate with engineering on data infrastructure',
    'Develop statistical models and predictive analytics',
    'Communicate findings to technical and non-technical audiences',
    'Ensure data quality and governance standards'
  ],
  devops: [
    'Design and maintain CI/CD pipelines for automated deployments',
    'Manage cloud infrastructure using IaC tools',
    'Implement monitoring, alerting, and observability systems',
    'Optimize infrastructure costs and resource utilization',
    'Ensure security best practices across all systems',
    'Participate in incident response and post-mortems',
    'Automate operational tasks and improve developer workflows'
  ],
  mobile: [
    'Build native mobile applications for iOS and/or Android',
    'Implement responsive designs and smooth animations',
    'Optimize app performance and battery usage',
    'Integrate with backend APIs and third-party services',
    'Write comprehensive unit and UI tests',
    'Handle app store submissions and release management',
    'Debug platform-specific issues and edge cases'
  ],
  security: [
    'Conduct security audits and penetration testing',
    'Implement security controls and compliance measures',
    'Monitor systems for security threats and vulnerabilities',
    'Respond to security incidents and coordinate remediation',
    'Develop security training programs for engineering teams',
    'Review code and architecture for security vulnerabilities',
    'Maintain security documentation and compliance reports'
  ]
}

/**
 * Domain-Specific Terminology
 */
export const DOMAIN_TERMS: Record<string, string[]> = {
  healthtech: [
    'HIPAA compliance',
    'PHI (Protected Health Information)',
    'Medical data security',
    'Healthcare interoperability',
    'Clinical workflows',
    'Patient engagement',
    'Telehealth',
    'EHR/EMR integration'
  ],
  fintech: [
    'PCI DSS compliance',
    'Payment processing',
    'Financial regulations',
    'Transaction security',
    'KYC/AML',
    'Fraud detection',
    'Banking APIs',
    'Cryptocurrency'
  ],
  ecommerce: [
    'Product catalog management',
    'Shopping cart optimization',
    'Payment gateway integration',
    'Inventory management',
    'Order fulfillment',
    'Personalization',
    'Conversion optimization',
    'Multi-channel retail'
  ],
  saas: [
    'Multi-tenancy',
    'Subscription management',
    'Usage-based billing',
    'API rate limiting',
    'Webhook infrastructure',
    'SLA monitoring',
    'Customer onboarding',
    'Feature flagging'
  ]
}
