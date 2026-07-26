export class SmsService {
  constructor(provider) {
    this.provider = provider;
  }

  async send(to, message) {
    return this.provider.send(to, message);
  }

  async sendBulk(recipients, message) {
    return Promise.all(recipients.map((to) => this.send(to, message)));
  }
}

export class ConsoleSmsProvider {
  async send(to, message) {
    console.log(`[SMS] To: ${to}, Message: ${message}`);
    return { success: true, to };
  }
}

export const smsService = new SmsService(new ConsoleSmsProvider());
