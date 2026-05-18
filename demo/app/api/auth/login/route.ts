import { NextResponse } from "next/server";

// Demo stub.
export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
