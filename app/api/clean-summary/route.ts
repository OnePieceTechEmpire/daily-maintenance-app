import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, mode } = await req.json();

    if (text === undefined) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const trimmed = String(text).trim();

    // IMPORTANT: if empty, return empty (so captions can stay blank)
    if (!trimmed) {
      return NextResponse.json({ cleaned: "" });
    }

    const system =
      mode === "caption"
        ? `
You rewrite construction site photo captions.
Input may be Malay.
Output must be clear, simple, professional English.
Keep it short (6–16 words). No emojis. No hashtags.
Return only the caption text. No Malay in output.
`
        : `
You rewrite construction daily report summaries.
Input may be Malay.
Output must be in clear, simple, professional English that sounds natural and human,
as if written by a site supervisor reporting progress to a client.
Avoid high-level vocabulary. Focus on clarity and accuracy.
Do not include Malay in the output.
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
          { role: "user", content: trimmed },
        ],
        temperature: 0.3,
      }),
    });

    const json = await apiRes.json();
    const cleaned = json.choices?.[0]?.message?.content?.trim() || trimmed;

    return NextResponse.json({ cleaned });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to clean text" },
      { status: 500 }
    );
  }
}
