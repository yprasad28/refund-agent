import { NextResponse } from "next/server";
import { getLogs } from "@/lib/log-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = getLogs();
  return NextResponse.json(logs);
}
