import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import ReportPDF from "@/lib/pdf/ReportPDF";


export async function POST(req: Request) {
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "Missing reportId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch report
    const { data: report } = await supabase
      .from("daily_reports")
      .select("*, projects(name, description)")
      .eq("id", reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch images
    const { data: images } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    // Generate PDF
const pdfBuffer = await renderToBuffer(
  <ReportPDF
    projectName={report.projects.name}
    projectDescription={report.projects.description}
    reportDate={report.report_date}
    summary={report.summary}
    images={images || []}
    weather={report.weather || []}
    materials={report.materials || []}
    equipment={report.equipment || []}
    workers={report.workers}
  />
);

    const filePath = `reports/${reportId}.pdf`;

    await supabase.storage
      .from("report-pdf")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-pdf/${filePath}`;

const now = new Date().toISOString();

await supabase
  .from("daily_reports")
  .update({ pdf_url: pdfUrl, updated_at: now })
  .eq("id", reportId);


    return NextResponse.json({ success: true, pdfUrl });
  } catch (err) {
    console.error("PDF ERROR", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
