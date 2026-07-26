export const ARCHITECTURE_PRINCIPLES = Object.freeze({
  clean: 'Clean Architecture — dependency inversion; inner layers know nothing of outer layers.',
  onion: 'Onion Architecture — core domain at center; infrastructure at edges.',
  hexagonal: 'Hexagonal Architecture — ports and adapters; symmetric driver/driven interfaces.',
  layered: 'Layered Architecture — presentation, business, persistence, infrastructure.',
  ddd: 'Domain-Driven Design — ubiquitous language, bounded contexts, aggregates, repositories.',
  solid: {
    single: 'Single Responsibility — each module has one reason to change.',
    open: 'Open/Closed — open for extension, closed for modification.',
    substitution: 'Liskov Substitution — subtypes must be substitutable for base types.',
    segregation: 'Interface Segregation — many specific interfaces over one general.',
    inversion: 'Dependency Inversion — depend on abstractions, not concretions.',
  },
  dry: 'DRY — every piece of knowledge has a single authoritative representation.',
  kiss: 'KISS — simplicity over complexity; solve today\'s problem, not tomorrow\'s.',
  separation: 'Separation of Concerns — distinct concerns in distinct modules.',
  composition: 'Composition over Inheritance — assemble behavior via composition.',
  di: 'Dependency Injection — dependencies provided, not created.',
  eventDriven: 'Event-Driven Architecture — decoupled services communicate via events.',
  cqrs: 'CQRS — separate read and write models.',
  modularMonolith: 'Modular Monolith — modular code in a single deployment unit.',
  microserviceReady: 'Microservice Ready — modules are independently deployable candidates.',
  plugin: 'Plugin Architecture — core is extensible via plugins without modification.',
  featureFirst: 'Feature-First Architecture — organize by feature, not by layer.',
  multiPackage: 'Multi-Package Workspace — shared libraries across projects.',
  whiteLabel: 'White-Label Architecture — core UI and logic can be rebranded per tenant.',
  multiTenant: 'Multi-Tenant Architecture — data and config isolated per tenant.',
  offlineFirst: 'Offline-First — app functions without network; sync when connected.',
  apiFirst: 'API-First — APIs are primary interface; UI is a consumer.',
  aiReady: 'AI-Ready — architecture supports AI agents, vector search, RAG patterns.',
});

export const ARCHITECTURE_LAYERS = Object.freeze({
  presentation: {
    path: 'components/', description: 'UI components and pages.',
    depends: ['application'],
  },
  application: {
    path: 'services/', description: 'Orchestration and application services.',
    depends: ['domain'],
  },
  domain: {
    path: 'business/', description: 'Core business logic and domain models.',
    depends: [],
  },
  infrastructure: {
    path: 'data/', description: 'Persistence, caching, and external integrations.',
    depends: ['domain'],
  },
});

export function validateArchitecture(projectStructure) {
  const violations = [];
  const layers = ['components', 'services', 'business', 'data'];
  for (const layer of layers) {
    const deps = projectStructure[layer]?.imports || [];
    const allowed = ARCHITECTURE_LAYERS[layer]?.depends || [];
    for (const dep of deps) {
      if (!allowed.includes(dep)) {
        violations.push(`${layer} should not depend on ${dep}`);
      }
    }
  }
  return violations;
}
