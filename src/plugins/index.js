export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }

  register(plugin) {
    if (this.plugins.has(plugin.name)) throw new Error(`Plugin already registered: ${plugin.name}`);
    this.plugins.set(plugin.name, plugin);
    if (plugin.hooks) {
      for (const [hook, handler] of Object.entries(plugin.hooks)) {
        if (!this.hooks.has(hook)) this.hooks.set(hook, []);
        this.hooks.get(hook).push(handler);
      }
    }
    if (plugin.init) plugin.init(this);
  }

  unregister(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    if (plugin.hooks) {
      for (const hook of Object.keys(plugin.hooks)) {
        const handlers = this.hooks.get(hook);
        if (handlers) this.hooks.set(hook, handlers.filter((h) => !plugin.hooks[hook].includes(h)));
      }
    }
    if (plugin.destroy) plugin.destroy(this);
    this.plugins.delete(name);
  }

  async runHook(hook, ...args) {
    const handlers = this.hooks.get(hook) || [];
    for (const handler of handlers) {
      await handler(...args);
    }
  }

  get(name) {
    return this.plugins.get(name);
  }

  list() {
    return Array.from(this.plugins.keys());
  }
}

export const pluginManager = new PluginManager();
