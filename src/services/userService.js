import { usersRepository } from '../data-layer/repositories/usersRepository.js';

class UserService {
  async list() {
    return await usersRepository.getAll();
  }

  async get(id) {
    return await usersRepository.getById(id);
  }

  async create(userData) {
    return await usersRepository.create(userData);
  }

  async update(id, patch) {
    return await usersRepository.update(id, patch);
  }

  async remove(id) {
    return await usersRepository.remove(id);
  }

  async findByEmail(email) {
    const all = await usersRepository.getAll();
    return all.find(u => u.email === email.toLowerCase()) || null;
  }

  async findByUsername(username) {
    const all = await usersRepository.getAll();
    return all.find(u => u.username === username.toLowerCase()) || null;
  }
}

export const userService = new UserService();
export default userService;
