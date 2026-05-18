import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  return NextResponse.json(
    { error: "AI features only run in the self-hosted version." },
    { status: 501 },
  );
}
