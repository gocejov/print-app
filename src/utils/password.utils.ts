import { randomBytes, scrypt as derive, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(derive);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (/^\$2[aby]\$/.test(encoded)) {
    // Keep existing bcrypt accounts usable; new passwords use scrypt.
    return new Promise(resolve => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Legacy package has no bundled TypeScript declarations.
      require('bcrypt-nodejs').compare(password, encoded, (err: Error, match: boolean) => resolve(!err && match));
    });
  }
  const parts = encoded.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const actual = await scrypt(password, parts[1], 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
}
