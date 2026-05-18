import { hash, verify } from "@node-rs/argon2";

const PARAMS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, PARAMS);
}

export function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return verify(stored, plain);
}
