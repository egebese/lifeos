// Demo stub: no real password hashing.
export async function hashPassword(_plain: string): Promise<string> {
  return "demo";
}

export async function verifyPassword(
  _plain: string,
  _stored: string,
): Promise<boolean> {
  return true;
}
