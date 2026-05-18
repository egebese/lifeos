import { NextResponse } from "next/server";

// Demo stub. Redirects back to home.
export async function POST(req: Request): Promise<Response> {
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
