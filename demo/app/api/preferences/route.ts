import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({ preferences: [] });
}
export async function POST(): Promise<Response> {
  return NextResponse.json({ id: "demo" });
}
export async function DELETE(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
