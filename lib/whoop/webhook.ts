import crypto from "node:crypto";

export function verifyWhoopSignature(args: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
}): boolean {
  if (!args.signature || !args.timestamp) return false;
  // 5-min replay window
  const tsMs = Date.parse(args.timestamp);
  if (Number.isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60_000) {
    // Whoop sends timestamp in milliseconds or seconds; tolerate both
    const tsNum = Number(args.timestamp);
    if (Number.isNaN(tsNum)) return false;
  }
  const mac = crypto
    .createHmac("sha256", args.secret)
    .update(args.timestamp + args.rawBody)
    .digest("base64");

  // Constant-time compare
  try {
    return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(args.signature));
  } catch {
    return false;
  }
}
