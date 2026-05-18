import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  return NextResponse.json({ error: "Uploads disabled in demo." }, { status: 501 });
}
