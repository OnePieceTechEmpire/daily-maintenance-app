import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    const res = await fetch(
      "https://wnvkfycjjuxjezxggcpg.functions.supabase.co/generate-pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ reportId }),
      }
    );

    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    console.error("Trigger PDF error:", err);
    return NextResponse.json(
      { error: "Failed to trigger PDF" },
      { status: 500 }
    );
  }
}
