import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/supabase";

export async function GET() {
  const db = await checkDatabaseConnection();

  const status = db.ok ? "ok" : "degraded";
  const httpStatus = db.ok ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: db.ok ? "ok" : "error",
          message: db.message
        }
      }
    },
    { status: httpStatus }
  );
}
