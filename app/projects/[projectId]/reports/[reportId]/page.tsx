"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

  const [report, setReport] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);

  // Load report details
  useEffect(() => {
    loadReport();
    loadImages();
  }, []);

  // Fetch main report info
  async function loadReport() {
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    setReport(data);
  }

  // Fetch images
  async function loadImages() {
    const { data } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    setImages(data || []);
  }

  if (!report) {
    return <div className="p-6">Loading...</div>;
  }

return (
  <div className="min-h-screen bg-gray-100">

    {/* HEADER */}
<div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white rounded-b-3xl shadow-lg">
  <div className="max-w-4xl mx-auto flex justify-between items-center">

    <div className="flex items-center gap-4">
      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <div>
        <h1 className="text-2xl font-bold">Daily Report</h1>
        <p className="text-blue-100 text-sm mt-1">{report.report_date}</p>
      </div>
    </div>

        {/* PDF DOWNLOAD BUTTON */}
        {report.pdf_url && (
          <a
            href={report.pdf_url}
            target="_blank"
            className="flex items-center gap-2 bg-white text-blue-700 font-semibold py-2 px-4 rounded-xl shadow hover:bg-gray-100 active:scale-95 transition"
          >
            {/* PDF Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a2.625 2.625 0 00-2.625-2.625H7.125A2.625 2.625 0 004.5 11.625v6.75A2.625 2.625 0 007.125 21h9.75A2.625 2.625 0 0019.5 18.375V16.5M12 6.75V15m0 0l-3-3m3 3l3-3"
              />
            </svg>
            PDF
          </a>
        )}

      </div>
    </div>

    {/* MAIN CONTENT */}
    <div className="max-w-4xl mx-auto p-5 space-y-10">

      {/* SUMMARY SECTION */}
      <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Summary</h2>

        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
          {report.summary || "No summary provided."}
        </p>
      </div>

      {/* IMAGES SECTION */}
      <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Photos</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white"
            >
              <img
                src={img.image_url}
                className="w-full h-40 object-cover"
              />
              <div className="p-3 bg-gray-50 border-t">
                <p className="text-sm text-gray-700">{img.caption || "No caption"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BACK BUTTON */}
      <div className="pb-10">
        <button
          onClick={() => router.push(`/projects/${projectId}/dashboard`)}
          className="
            w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-semibold 
            shadow active:scale-95 transition
          "
        >
          Back to Dashboard
        </button>
      </div>

    </div>

  </div>
);

}
