import bcrypt from "bcryptjs";

const MIN_LENGTH = 10;
const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_LENGTH) {
    throw new Error(`Password must be at least ${MIN_LENGTH} characters`);
  }
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
