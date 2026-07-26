import { config } from '../../config/index.js';

let storageClient = null;
let storageClientPromise = null;

async function getStorageClient() {
  if (storageClient) return storageClient;
  if (storageClientPromise) return storageClientPromise;
  storageClientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    storageClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
    return storageClient;
  })();
  return storageClientPromise;
}

export class StorageService {
  constructor() {
    this.provider = config.storageProvider;
    this.rootFolder = config.storageRootFolder;
  }

  async upload(file, path) {
    const client = await getStorageClient();
    const { data, error } = await client.storage
      .from(config.supabaseBucket)
      .upload(path, file);
    if (error) throw new Error(error.message);
    return { url: data.fullPath, path: data.fullPath };
  }

  async getUrl(path) {
    const client = await getStorageClient();
    const { data } = client.storage
      .from(config.supabaseBucket)
      .getPublicUrl(path);
    return data?.publicUrl || path;
  }

  async delete(path) {
    const client = await getStorageClient();
    const { error } = await client.storage
      .from(config.supabaseBucket)
      .remove([path]);
    return !error;
  }
}

export const storage = new StorageService();
