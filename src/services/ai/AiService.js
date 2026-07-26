export class AiService {
  constructor(provider) {
    this.provider = provider;
  }

  async chat(messages, options = {}) {
    return this.provider.chat(messages, options);
  }

  async embed(text) {
    return this.provider.embed(text);
  }

  async complete(prompt, options = {}) {
    return this.provider.complete(prompt, options);
  }

  async analyze(text, options = {}) {
    return this.provider.analyze(text, options);
  }
}

export class OpenAiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async chat(messages) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4', messages }),
    });
    return res.json();
  }

  async embed(text) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    return res.json();
  }

  async complete(prompt) {
    return this.chat([{ role: 'user', content: prompt }]);
  }
}

export class MockAiProvider {
  async chat() { return { choices: [{ message: { content: 'Mock AI response' } }] }; }
  async embed() { return { data: [{ embedding: new Array(1536).fill(0) }] }; }
  async complete() { return { choices: [{ text: 'Mock completion' }] }; }
}

export const aiService = new AiService(new MockAiProvider());
