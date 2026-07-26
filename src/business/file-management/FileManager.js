export class FileManager {
  constructor(storageProvider) {
    this.storage = storageProvider;
  }

  async upload(file, path, options = {}) {
    const filename = options.rename
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
      : file.name;
    const fullPath = `${path}/${filename}`.replace(/\/+/g, '/');
    return this.storage.upload(fullPath, file);
  }

  async delete(path) {
    return this.storage.delete(path);
  }

  async getUrl(path) {
    return this.storage.getUrl(path);
  }

  async list(path) {
    return this.storage.list(path);
  }

  async getMetadata(path) {
    return this.storage.metadata?.(path);
  }

  validate(file, options = {}) {
    const errors = [];
    const maxSize = options.maxSize || 10 * 1024 * 1024;
    const allowedTypes = options.allowedTypes || [];

    if (file.size > maxSize) {
      errors.push(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    return { valid: errors.length === 0, errors };
  }
}
