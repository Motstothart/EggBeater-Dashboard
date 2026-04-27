import { NextResponse } from "next/server";
import { syncCalendar } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncCalendar();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
