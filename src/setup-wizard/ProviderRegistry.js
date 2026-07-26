import { isMissingTableError } from '../utils/dbErrors.js';

export const PROVIDERS = [
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Open-source Firebase alternative with PostgreSQL, auth, and storage.',
    logo: 'S',
    color: '#3ECF8E',
    fields: [
      { key: 'projectUrl', label: 'Project URL', placeholder: 'https://your-project.supabase.co', type: 'url', required: true, description: 'The unique Supabase project API URL.' },
      { key: 'anonKey', label: 'Anon Key', placeholder: 'Enter Supabase Anon Public Key', type: 'password', required: true, description: 'Used for client-side authentication and public API access.', sensitive: false },
      { key: 'serviceRoleKey', label: 'Service Role Key', placeholder: 'Enter Supabase Service Role Key', type: 'password', required: true, description: 'Required for installation, schema validation, SQL execution, and administrative database operations.', sensitive: true },
    ],
    async validate(config) {
      return validateSupabase(config);
    },
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Powerful, open-source object-relational database system.',
    logo: 'P',
    color: '#336791',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '5432', type: 'text', required: true },
      { key: 'database', label: 'Database', placeholder: 'postgres', type: 'text', required: true },
      { key: 'user', label: 'Username', placeholder: 'postgres', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'password', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'PostgreSQL validation not yet implemented.' } };
    },
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Popular open-source relational database management system.',
    logo: 'M',
    color: '#4479A1',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '3306', type: 'text', required: true },
      { key: 'database', label: 'Database', placeholder: 'mysql', type: 'text', required: true },
      { key: 'user', label: 'Username', placeholder: 'root', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'password', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'MySQL validation not yet implemented.' } };
    },
  },
  {
    id: 'mariadb',
    name: 'MariaDB',
    description: 'Community-developed fork of MySQL with enhanced features.',
    logo: 'M',
    color: '#003545',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '3306', type: 'text', required: true },
      { key: 'database', label: 'Database', placeholder: 'mariadb', type: 'text', required: true },
      { key: 'user', label: 'Username', placeholder: 'root', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'password', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'MariaDB validation not yet implemented.' } };
    },
  },
  {
    id: 'sqlserver',
    name: 'Microsoft SQL Server',
    description: 'Enterprise-grade relational database by Microsoft.',
    logo: 'S',
    color: '#CC2927',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '1433', type: 'text', required: true },
      { key: 'database', label: 'Database', placeholder: 'master', type: 'text', required: true },
      { key: 'user', label: 'Username', placeholder: 'sa', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'password', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'SQL Server validation not yet implemented.' } };
    },
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Lightweight, file-based embedded database engine.',
    logo: 'L',
    color: '#003B57',
    fields: [
      { key: 'filepath', label: 'Database File Path', placeholder: '/path/to/database.db', type: 'text', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'SQLite validation not yet implemented.' } };
    },
  },
  {
    id: 'oracle',
    name: 'Oracle Database',
    description: 'Enterprise multi-model database management system.',
    logo: 'O',
    color: '#F80000',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'localhost', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '1521', type: 'text', required: true },
      { key: 'sid', label: 'SID / Service Name', placeholder: 'ORCL', type: 'text', required: true },
      { key: 'user', label: 'Username', placeholder: 'system', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'Enter password', type: 'password', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'Oracle validation not yet implemented.' } };
    },
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'NoSQL document database with flexible schema design.',
    logo: 'M',
    color: '#47A248',
    fields: [
      { key: 'uri', label: 'Connection URI', placeholder: 'mongodb://localhost:27017/mydb', type: 'text', required: true },
    ],
    async validate(config) {
      return { ok: false, errors: { _summary: 'MongoDB validation not yet implemented.' } };
    },
  },
];


export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id);
}

async function validateSupabase(config) {
  const errors = {};
  const { projectUrl, anonKey, serviceRoleKey } = config;

  if (!projectUrl || !projectUrl.startsWith('https://')) {
    errors.projectUrl = 'Invalid Project URL. Must start with https://';
  }

  if (!anonKey || anonKey.length < 10) {
    errors.anonKey = 'Invalid Anon Key.';
  }

  if (!serviceRoleKey || serviceRoleKey.length < 10) {
    errors.serviceRoleKey = 'Invalid Service Role Key.';
  }

  if (Object.keys(errors).length > 0) {
    errors._summary = 'Connection validation failed. Please review the highlighted fields and enter valid database credentials before continuing.';
    return { ok: false, errors };
  }

  try {
    const url = projectUrl.replace(/\/$/, '');
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js');

    const supabase = createClient(url, anonKey);
    const { error: versionError } = await supabase.from('_schema_version').select('version').limit(1);

    if (versionError && !isMissingTableError(versionError)) {
      if (versionError.message?.includes('Failed to fetch') || versionError.message?.includes('NetworkError')) {
        errors._summary = 'Unable to connect to the Supabase project. Check the Project URL and network connectivity.';
        return { ok: false, errors };
      }
      if (versionError.code === 'invalid_api_key' || versionError.message?.includes('Invalid')) {
        errors.anonKey = 'Invalid Anon Key.';
        errors._summary = 'Authentication failed. The Anon Key is not valid for this project.';
        return { ok: false, errors };
      }
    }

    const serviceClient = createClient(url, serviceRoleKey);
    const { error: authError } = await serviceClient.auth.admin.listUsers().catch(() => ({ error: { message: 'Failed to verify service role key' } }));
    if (authError) {
      errors.serviceRoleKey = 'Invalid Service Role Key.';
      errors._summary = 'Authorization failed. The Service Role Key is not valid for this project.';
      return { ok: false, errors };
    }

    return {
      ok: true,
      projectInfo: { url: projectUrl },
      client: serviceClient,
    };
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      errors._summary = 'Network connection failed. Please check your internet connection and verify the Project URL.';
    } else if (err.message?.includes('timed out')) {
      errors._summary = 'Request timed out. The server is not responding.';
    } else {
      errors._summary = `Connection validation failed: ${err.message}`;
    }
    return { ok: false, errors };
  }
}

export function registerProvider(providerDef) {
  PROVIDERS.push(providerDef);
}
