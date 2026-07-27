import { config } from '../../config/index.js';
import { getSupabaseClient } from '../../identity/auth/supabaseClient.js';

export class StorageService {
  constructor() {
    this.provider = config.storageProvider;
    this.rootFolder = config.storageRootFolder;
  }

  async upload(file, path) {
    const client = await getSupabaseClient();
    const { data, error } = await client.storage
      .from(config.supabaseBucket)
      .upload(path, file);
    if (error) throw new Error(error.message);
    return { url: data.fullPath, path: data.fullPath };
  }

  async getUrl(path) {
    const client = await getSupabaseClient();
    const { data } = client.storage
      .from(config.supabaseBucket)
      .getPublicUrl(path);
    return data?.publicUrl || path;
  }

  async delete(path) {
    const client = await getSupabaseClient();
    const { error } = await client.storage
      .from(config.supabaseBucket)
      .remove([path]);
    return !error;
  }
}

export const storage = new StorageService();
