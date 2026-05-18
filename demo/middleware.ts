import { NextResponse } from "next/server";

// Demo: no auth, everything is public.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon\\.ico|manifest\\.json).*)"],
};
