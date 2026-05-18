// Demo stub: no real webhook verification.
export function verifyWhoopSignature(_args: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
}): boolean {
  return false;
}
