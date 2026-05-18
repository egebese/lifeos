// Demo stub: no real OAuth.

export const WHOOP_SCOPES = "";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

export function buildAuthorizeUrl(_state: string): string {
  return "/whoop";
}

export async function exchangeCode(_code: string): Promise<TokenResponse> {
  throw new Error("Whoop OAuth not available in demo");
}

export async function refreshToken(_refresh: string): Promise<TokenResponse> {
  throw new Error("Whoop OAuth not available in demo");
}

export async function saveTokens(
  _userId: string,
  _tok: TokenResponse,
): Promise<void> {
  // no-op
}

export async function ensureFreshToken(_userId: string): Promise<string | null> {
  return null;
}
