import { config } from '../../config/index.js';

export class StorageService {
  constructor() {
    this.provider = config.storageProvider;
    this.rootFolder = config.storageRootFolder;
  }

  async upload(file, path) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data, error } = await client.storage
      .from(config.supabaseBucket)
      .upload(path, file);
    if (error) throw new Error(error.message);
    return { url: data.fullPath, path: data.fullPath };
  }

  async getUrl(path) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = client.storage
      .from(config.supabaseBucket)
      .getPublicUrl(path);
    return data?.publicUrl || path;
  }

  async delete(path) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { error } = await client.storage
      .from(config.supabaseBucket)
      .remove([path]);
    return !error;
  }
}

export const storage = new StorageService();
