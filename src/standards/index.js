export const CODE_STANDARDS = Object.freeze({
  naming: {
    files: 'PascalCase for components, camelCase for utilities',
    components: 'PascalCase',
    functions: 'camelCase',
    constants: 'UPPER_SNAKE_CASE',
    cssClasses: 'kebab-case',
    envVars: 'UPPER_SNAKE_CASE with VITE_ prefix',
  },
  architecture: {
    pattern: 'Layered with Clean Architecture principles',
    dataFlow: 'Unidirectional — pages → services → data layer → provider',
    state: 'React context for app state, prop drilling for component state',
    imports: 'Absolute imports with @/ alias',
  },
  testing: {
    framework: 'Vitest',
    coverage: 'Minimum 80%',
    naming: '*.test.js or *.spec.js',
  },
  css: {
    location: 'src/css/index.css only',
    noInlineStyles: true,
    noPageSpecificCSS: true,
    responsive: 'Desktop-first with mobile breakpoints',
  },
  security: {
    xss: 'All user input sanitized',
    sql: 'Parameterized queries only',
    auth: 'Server-side auth always enforced',
    rls: 'Row Level Security on all database operations',
  },
  git: {
    branch: 'feature/*, fix/*, chore/*',
    commits: 'Conventional commits (feat:, fix:, chore:)',
  },
});

export const FOLDER_STANDARDS = Object.freeze({
  components: {
    ui: 'Reusable UI primitives',
    layout: 'Layout components (Header, Sidebar, etc.)',
    tables: 'Table-specific components',
  },
  business: 'Core business logic, engines, workflows',
  services: 'Application services, external integrations',
  data: 'Data access, repositories, providers',
  identity: 'Auth, RBAC, authorization, security',
  pages: 'Route-level page components',
  config: 'Application configuration',
  schema: 'Schema definitions, mappings, migrations',
});
