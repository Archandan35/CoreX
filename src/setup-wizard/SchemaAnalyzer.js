export class SchemaAnalyzer {
  constructor(schema) {
    this.schema = schema;
  }

  analyze(report) {
    const categories = {
      schemas: { label: 'Schemas', items: [], status: 'pending' },
      tables: { label: 'Tables', items: [], status: 'pending' },
      columns: { label: 'Columns', items: [], status: 'pending' },
      constraints: { label: 'Constraints', items: [], status: 'pending' },
      indexes: { label: 'Indexes', items: [], status: 'pending' },
      functions: { label: 'Functions', items: [], status: 'pending' },
      triggers: { label: 'Triggers', items: [], status: 'pending' },
      views: { label: 'Views', items: [], status: 'pending' },
      policies: { label: 'RLS Policies', items: [], status: 'pending' },
      extensions: { label: 'Extensions', items: [], status: 'pending' },
      seeds: { label: 'Seed Data', items: [], status: 'pending' },
      version: { label: 'Schema Version', items: [], status: 'pending' },
    };

    let hasMissing = false;
    let hasIssues = false;

    for (const [key, items] of Object.entries(report.details)) {
      if (!categories[key]) continue;

      if (key === 'version') {
        const v = report.details.version;
        const status = v?.match ? 'present' : 'mismatch';
        categories.version.items.push({
          name: `v${v?.required}`,
          expected: v?.required,
          actual: v?.current,
          status,
        });
        if (status === 'mismatch') hasIssues = true;
        categories.version.status = v?.match ? 'complete' : 'issues';
        continue;
      }

      if (!items || !Array.isArray(items)) continue;

      for (const item of items) {
        let status;
        if (item.exists === false || item.installed === false || item.populated === false) {
          status = 'missing';
        } else if (item.status === 'missing') {
          status = 'missing';
        } else if (item.status === 'mismatch') {
          status = 'mismatch';
        } else {
          status = 'present';
        }
        categories[key].items.push({ ...item, status });
        if (status === 'missing') hasMissing = true;
        if (status === 'mismatch') hasIssues = true;
      }

      const catMissing = categories[key].items.some((i) => i.status === 'missing');
      const catIssues = categories[key].items.some((i) => i.status === 'mismatch');
      if (catMissing) categories[key].status = 'missing';
      else if (catIssues) categories[key].status = 'issues';
      else categories[key].status = 'complete';
    }

    const overallAnyMissing = hasMissing || report.missing.length > 0;
    const overallAnyIssues = hasIssues || report.issues?.length > 0;

    for (const [, cat] of Object.entries(categories)) {
      if (cat.items.length === 0) {
        if (overallAnyMissing) cat.status = 'missing';
        else if (overallAnyIssues) cat.status = 'issues';
        else cat.status = 'complete';
        cat.items.push({ name: '—', status: cat.status === 'complete' ? 'present' : 'missing' });
      }
    }

    const depCats = [categories.constraints, categories.extensions].filter(Boolean);
    const dependencyStatus = depCats.some((c) => c.status === 'missing')
      ? 'missing'
      : depCats.some((c) => c.status === 'issues')
        ? 'issues'
        : 'complete';

    return {
      categories,
      totalPresent: report.existing.length,
      totalMissing: report.missing.length,
      totalIssues: report.issues?.length || 0,
      isComplete: report.valid,
      dependencyStatus,
    };
  }

  getInstallationPlan(analysis) {
    const plan = {
      existing: [],
      toCreate: [],
      toUpdate: [],
      toSkip: [],
      executionOrder: [],
      dependencies: [],
    };

    for (const [, category] of Object.entries(analysis.categories)) {
      for (const item of category.items) {
        if (item.status === 'present') plan.existing.push(item);
        else if (item.status === 'missing') plan.toCreate.push(item);
        else if (item.status === 'mismatch') plan.toUpdate.push(item);
        else plan.toSkip.push(item);
      }
    }

    plan.executionOrder = [
      ...plan.toCreate.filter((i) => i.type === 'extension'),
      ...plan.toCreate.filter((i) => i.type === 'table'),
      ...plan.toCreate.filter((i) => i.type === 'column'),
      ...plan.toCreate.filter((i) => i.type === 'constraint'),
      ...plan.toCreate,
    ];
    plan.dependencies = plan.toCreate.filter((i) => i.type === 'constraint' || i.type === 'extension' || i.constraint);
    plan.dependencyStatus = analysis.dependencyStatus || 'complete';

    return plan;
  }
}
