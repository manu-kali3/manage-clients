import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { loadSubscribersData } from "@/lib/booking-data";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { subscribers, dbError } = await loadSubscribersData();
  if (dbError) {
    return NextResponse.json({ error: dbError }, { status: 500 });
  }
  return NextResponse.json({ subscribers });
}
