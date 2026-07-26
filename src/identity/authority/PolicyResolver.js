export class Policy {
  constructor(name, effect, actions, subjects, conditions = []) {
    this.name = name;
    this.effect = effect;
    this.actions = actions;
    this.subjects = subjects;
    this.conditions = conditions;
  }

  appliesTo(subject) {
    if (this.subjects.includes('*')) return true;
    return this.subjects.includes(subject);
  }

  matchesAction(action) {
    return this.actions.includes('*') || this.actions.includes(action);
  }

  evaluate(context) {
    if (this.conditions.length === 0) return true;
    return this.conditions.every((c) => c(context));
  }

  resolve(action, subject, context) {
    if (!this.appliesTo(subject)) return null;
    if (!this.matchesAction(action)) return null;
    if (!this.evaluate(context)) return null;
    return this.effect;
  }
}

export class PolicyResolver {
  constructor() {
    this.policies = [];
  }

  add(policy) {
    this.policies.push(policy);
  }

  resolve(action, subject, context) {
    let result = 'deny';

    for (const policy of this.policies) {
      const effect = policy.resolve(action, subject, context);
      if (effect === 'allow') result = 'allow';
      if (effect === 'deny') return 'deny';
    }

    return result;
  }

  isAllowed(action, subject, context) {
    return this.resolve(action, subject, context) === 'allow';
  }
}
