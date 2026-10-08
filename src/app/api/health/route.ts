import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness: the process is up. Public, no dependencies, reveals nothing. */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
