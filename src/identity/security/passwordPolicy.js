const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', 'qwerty',
  'abc123', 'monkey', 'letmein', 'dragon', '111111',
  'baseball', 'iloveyou', 'trustno1', 'sunshine', 'master',
]);

export const PASSWORD_RULES = Object.freeze({
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  rejectCommon: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
});

export function validatePassword(password) {
  const errors = [];
  const rules = PASSWORD_RULES;

  if (!password || password.length < rules.minLength) {
    errors.push(`At least ${rules.minLength} characters`);
  }
  if (password && password.length > rules.maxLength) {
    errors.push(`No more than ${rules.maxLength} characters`);
  }
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (rules.requireNumber && !/[0-9]/.test(password)) {
    errors.push('One number');
  }
  if (rules.requireSpecial && !new RegExp(`[${rules.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) {
    errors.push('One special character');
  }
  if (rules.rejectCommon && COMMON_PASSWORDS.has(password?.toLowerCase())) {
    errors.push('Common password not allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.max(0, 100 - errors.length * 20),
    checks: {
      length: password?.length >= rules.minLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: new RegExp(`[${rules.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password),
      notCommon: !COMMON_PASSWORDS.has(password?.toLowerCase()),
    },
  };
}

export function estimateStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: 'None' };
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 16) score += 15;
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Medium' : score >= 25 ? 'Weak' : 'Very Weak';
  return { score, label };
}
