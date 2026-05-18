import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  return NextResponse.json({
    ok: true,
    recovery: 0,
    sleep: 0,
    strain: 0,
    workouts: 0,
    errors: {},
    sinceDays: 30,
  });
}
