import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chromium } from "npm:playwright-core";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


serve(async (req) => {
    // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "Missing reportId" }),
        { status: 400 }
      );
    }

    // 1️⃣ Supabase Admin Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2️⃣ Fetch report
    const { data: report } = await supabase
      .from("daily_reports")
      .select("*, projects(name)")
      .eq("id", reportId)
      .single();

    if (!report) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404 }
      );
    }

    // 3️⃣ Fetch images
    const { data: images } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    // 4️⃣ Build HTML
    const html = `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #111;
          }
          h1 {
            color: #1e3a8a;
            margin-bottom: 0;
          }
          .date {
            color: #555;
            margin-bottom: 20px;
          }
          .summary {
            margin-bottom: 30px;
            line-height: 1.6;
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .img-box {
            page-break-inside: avoid;
          }
          img {
            width: 100%;
            border-radius: 6px;
          }
          .caption {
            font-size: 12px;
            margin-top: 4px;
            color: #444;
          }
          footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>

        <h1>${report.projects.name}</h1>
        <div class="date">Daily Report — ${report.report_date}</div>

        <h3>Summary</h3>
        <div class="summary">
          ${report.summary || "No summary provided."}
        </div>

        <h3>Photos</h3>
        <div class="grid">
          ${(images ?? [])
            .map(
              (img) => `
              <div class="img-box">
                <img src="${img.image_url}" />
                <div class="caption">${img.caption || ""}</div>
              </div>
            `
            )
            .join("")}
        </div>

        <footer>
          Generated automatically by Site Maintenance System
        </footer>

      </body>
      </html>
    `;

    // 5️⃣ Launch Chromium
const browser = await chromium.launch({
  headless: true,
});

const page = await browser.newPage();
await page.setContent(html);

const pdfBuffer = await page.pdf({
  format: "A4",
  printBackground: true,
});

await browser.close();

    // 6️⃣ Upload PDF
    const filePath = `reports/${reportId}.pdf`;

    await supabase.storage
      .from("report-pdf")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    const pdfUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/report-pdf/${filePath}`;

    // 7️⃣ Save URL
    await supabase
      .from("daily_reports")
      .update({ pdf_url: pdfUrl })
      .eq("id", reportId);

return new Response(
  JSON.stringify({ success: true, pdfUrl }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  }
);
    
  } catch (err) {
    console.error("PDF ERROR", err);
return new Response(
  JSON.stringify({ error: "PDF generation failed" }),
  {
    status: 500,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  }
);
  }
});
