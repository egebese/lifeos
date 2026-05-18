import { NextResponse } from "next/server";

// Demo stub. Real data is sourced from the client-side demo store.
export async function GET(): Promise<Response> {
  return NextResponse.json({ exercises: [] });
}
