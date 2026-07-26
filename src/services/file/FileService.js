import { FileManager } from '../../business/file-management/FileManager.js';

export class FileService {
  constructor(storageProvider) {
    this.fileManager = new FileManager(storageProvider);
  }

  async upload(file, path = '/uploads', options = {}) {
    return this.fileManager.upload(file, path, options);
  }

  async delete(path) {
    return this.fileManager.delete(path);
  }

  async getUrl(path) {
    return this.fileManager.getUrl(path);
  }

  async list(path) {
    return this.fileManager.list(path);
  }

  validate(file, options = {}) {
    return this.fileManager.validate(file, options);
  }
}

export const fileService = new FileService(null);
