import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export const minimumPasswordLength = 8;

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < minimumPasswordLength) {
    return `Password must be at least ${minimumPasswordLength} characters.`;
  }
  return '';
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, keyLength);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export function createPasswordResetToken() {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof passwordHash !== 'string') return false;
  const [algorithm, salt, storedKey] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !storedKey) return false;

  const storedBuffer = Buffer.from(storedKey, 'hex');
  const derivedKey = await scrypt(password, salt, storedBuffer.length);
  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}

export function allowLegacyEmptyPasswordLogin() {
  return process.env.ALLOW_LEGACY_EMPTY_PASSWORD_LOGIN === 'true';
}
