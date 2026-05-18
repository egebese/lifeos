import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({ program: null });
}
export async function PATCH(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
export async function DELETE(): Promise<Response> {
  return NextResponse.json({ ok: true });
}
