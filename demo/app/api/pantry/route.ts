import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({ items: [] });
}
export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
export async function DELETE(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
