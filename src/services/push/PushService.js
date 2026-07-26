export class PushService {
  constructor(provider) {
    this.provider = provider;
  }

  async send(deviceToken, title, body, data = {}) {
    return this.provider.send(deviceToken, { title, body, data });
  }

  async sendBulk(deviceTokens, title, body, data = {}) {
    return Promise.all(deviceTokens.map((token) => this.send(token, title, body, data)));
  }
}

export class ConsolePushProvider {
  async send(deviceToken, { title, body }) {
    console.log(`[Push] Token: ${deviceToken}, Title: ${title}, Body: ${body}`);
    return { success: true, deviceToken };
  }
}

export const pushService = new PushService(new ConsolePushProvider());
