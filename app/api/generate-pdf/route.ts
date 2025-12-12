import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    // 1️⃣ Fetch report data
    const { data: report } = await supabase
      .from("daily_reports")
      .select("*, projects(name)")
      .eq("id", reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2️⃣ Fetch images
    const { data: images } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    // 3️⃣ Build enhanced PDF HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Daily Report</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      color: #333;
    }

    h1 {
      text-align: center;
      font-size: 26px;
      margin-bottom: 5px;
    }

    h2 {
      margin-top: 30px;
      font-size: 20px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
    }

    .summary-box {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
      margin-bottom: 30px;
      line-height: 1.6;
      font-size: 14px;
    }

    .image-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      margin-top: 20px;
    }

    .image-item {
      width: 48%;
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .image-item img {
      width: 100%;
      height: 260px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #ddd;
    }

    .caption {
      margin-top: 6px;
      font-size: 13px;
      color: #555;
    }
  </style>
</head>

<body>

  <h1>${report.projects?.name || "Project"}</h1>
  <p style="text-align:center;">Daily Maintenance Report — ${report.report_date}</p>

  <h2>Summary</h2>
  <div class="summary-box">
    ${report.summary || "No summary provided."}
  </div>

<h2>Photos</h2>
<div class="image-grid">
  ${(images || [])
    .map(
      (img) => `
      <div class="image-item">
        <img src="${img.image_url}" />
        <div class="caption">${img.caption || ""}</div>
      </div>
    `
    )
    .join("")}
</div>


</body>
</html>
`;

    // 4️⃣ Puppeteer → Generate PDF
const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath,
  headless: chromium.headless,
});

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // 5️⃣ Upload PDF to Supabase
    const filePath = `reports/${reportId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("report-pdf")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-pdf/${filePath}`;

    // 6️⃣ Save URL to DB
    await supabase
      .from("daily_reports")
      .update({ pdf_url: pdfUrl })
      .eq("id", reportId);

    return NextResponse.json({ success: true, pdfUrl });

  } catch (err) {
    console.error("PDF Error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
