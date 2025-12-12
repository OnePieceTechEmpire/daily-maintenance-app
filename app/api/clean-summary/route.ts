import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Call OpenAI
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
role: "system",
content: `
You rewrite construction daily report summaries. 
The input may be in Malay. 
Your output must be in clear, simple, professional English that sounds natural and human,
as if written by a site supervisor reporting progress to a client. 
Avoid high-level vocabulary. Focus on clarity, accuracy, and a straightforward tone.
Do not include Malay in the output.
`

          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
      }),
    });

    const json = await apiRes.json();

    const cleaned = json.choices?.[0]?.message?.content || text;

    return NextResponse.json({ cleaned });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to clean summary" },
      { status: 500 }
    );
  }
}
