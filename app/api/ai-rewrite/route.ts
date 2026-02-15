import { NextResponse } from "next/server";

type Mode = "summary" | "caption";

export async function POST(req: Request) {
  try {
    const { mode, text } = await req.json();

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    if (!text || !text.trim()) {
      // IMPORTANT: if empty, just return empty (especially for captions)
      return NextResponse.json({ output: "" });
    }

    const system =
      mode === "summary"
        ? `
You rewrite construction daily report summaries.
Input may be Malay.
Output must be clear, simple, professional English.
Natural tone like a site supervisor.
No Malay in output.
`
        : `
You rewrite construction site photo captions.
Input may be Malay.
Output must be clear, simple, professional English.
Keep it short (6–16 words). No emojis. No hashtags.
Return only the caption text.
No Malay in output.
`;

    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      }),
    });

    const json = await apiRes.json();
    const output = json.choices?.[0]?.message?.content?.trim() || text;

    return NextResponse.json({ output });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI rewrite failed" }, { status: 500 });
  }
}
