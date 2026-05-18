import { NextResponse } from "next/server";

export async function GET(req: Request): Promise<Response> {
  return NextResponse.redirect(new URL("/whoop", req.url));
}
