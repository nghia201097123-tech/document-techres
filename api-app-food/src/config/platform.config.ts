import { registerAs } from '@nestjs/config';

// Default encryption key for development (32 bytes = 64 hex chars)
// IMPORTANT: Override this in production with a secure random key
const DEFAULT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export default registerAs('platform', () => ({
  grab: {
    baseUrl: process.env.GRAB_API_BASE_URL || 'https://api.grab.com/mex-app',
    clientId: process.env.GRAB_CLIENT_ID || '',
    clientSecret: process.env.GRAB_CLIENT_SECRET || '',
  },
  shopeeFood: {
    baseUrl: process.env.SHOPEE_FOOD_API_BASE_URL || 'https://api.shopeefood.vn/merchant/v4',
    clientId: process.env.SHOPEE_FOOD_CLIENT_ID || '',
    clientSecret: process.env.SHOPEE_FOOD_CLIENT_SECRET || '',
  },
  befood: {
    baseUrl: process.env.BEFOOD_API_BASE_URL || 'https://api.befood.vn/merchant',
    clientId: process.env.BEFOOD_CLIENT_ID || '',
    clientSecret: process.env.BEFOOD_CLIENT_SECRET || '',
  },
  polling: {
    defaultIntervalSeconds: parseInt(process.env.DEFAULT_POLL_INTERVAL_SECONDS || '30', 10),
    minIntervalSeconds: parseInt(process.env.MIN_POLL_INTERVAL_SECONDS || '5', 10),
    maxIntervalSeconds: parseInt(process.env.MAX_POLL_INTERVAL_SECONDS || '60', 10),
    timeoutMs: parseInt(process.env.POLL_TIMEOUT_MS || '10000', 10),
  },
  rateLimit: {
    loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
    loginWindowMinutes: parseInt(process.env.LOGIN_WINDOW_MINUTES || '15', 10),
    loginLockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '30', 10),
  },
  encryptionKey: process.env.ENCRYPTION_KEY || DEFAULT_ENCRYPTION_KEY,
}));
