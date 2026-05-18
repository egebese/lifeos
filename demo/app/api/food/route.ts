import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({ entries: [] });
}
export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
