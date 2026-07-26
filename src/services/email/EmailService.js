export class EmailService {
  constructor(provider) {
    this.provider = provider;
  }

  async send(to, subject, body, options = {}) {
    return this.provider.send({ to, subject, html: body, ...options });
  }

  async sendTemplate(to, template, data, options = {}) {
    return this.provider.sendTemplate({ to, template, data, ...options });
  }

  async sendBulk(recipients, subject, body) {
    return Promise.all(recipients.map((to) => this.send(to, subject, body)));
  }
}

export class SmtpEmailProvider {
  async send({ to, subject, html }) {
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    return { success: true, to, subject };
  }

  async sendTemplate({ to, template, data }) {
    console.log(`[Email] Template: ${template}, To: ${to}`);
    return { success: true, to, template };
  }
}

export const emailService = new EmailService(new SmtpEmailProvider());
