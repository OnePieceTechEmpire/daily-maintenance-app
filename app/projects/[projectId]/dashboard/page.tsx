"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  EyeIcon,
    DocumentArrowDownIcon
} from "@heroicons/react/24/solid";

export default function ProjectDashboard() {

type DailyReport = {
  id: string;
  project_id: string;
  report_date: string;
  summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
    pdf_url: string | null;   
};


  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    loadProject();
    loadReports();
  }, []);

  useEffect(() => {
    loadReportForSelectedDate();
  }, [selectedDate, reports]);

  async function loadProject() {
    let { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    setProject(data);
  }

  async function loadReports() {
    let { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });

    setReports(data || []);
  }

  async function loadReportForSelectedDate() {
    const report = reports.find((r: any) => r.report_date === selectedDate);
    setTodayReport(report || null);
  }

  function handleCreateOrContinue() {
    if (!todayReport) {
      router.push(`/projects/${projectId}/reports/new?date=${selectedDate}`);
      return;
    }

    if (todayReport.status === "draft") {
      router.push(`/projects/${projectId}/reports/${todayReport.id}/edit`);
      return;
    }

    if (todayReport.status === "completed") {
      router.push(`/projects/${projectId}/reports/${todayReport.id}`);
    }
  }

  function getPdfHref(pdfUrl: string, updatedAt?: string | null) {
  const v = updatedAt ? encodeURIComponent(updatedAt) : Date.now();
  return `${pdfUrl}?v=${v}`;
}


return (
  <div className="min-h-screen bg-gray-100">

{/* HEADER */}
<div className="bg-blue-700 text-white shadow-lg">

  {/* SAFE AREA TOP */}
  <div className="h-[env(safe-area-inset-top)]" />

  {/* HEADER CONTENT */}
  <div className="p-6 rounded-b-3xl">

  <div className="max-w-5xl mx-auto flex justify-between items-start">

    <div>
      <h1 className="text-3xl font-bold">{project?.name || "Loading..."}</h1>
            <p className="text-white text-sm mt-1 opacity-90">
        {project?.description}
      </p>
    </div>

    {/* DROPDOWN MENU */}
    <div className="relative">
<button
  onClick={() => setMenuOpen(!menuOpen)}
  className="bg-white/20 p-3 rounded-xl hover:bg-white/30 transition flex items-center justify-center"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    className="w-7 h-7 md:w-8 md:h-8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
</button>


      {menuOpen && (
        <div className="absolute right-0 mt-2 bg-white text-gray-800 shadow-lg rounded-lg w-40 py-2 z-30">
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => router.push("/projects")}
          >
            My Projects
          </button>

          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => router.push(`/projects/${projectId}/reports`)}
          >
            All Reports
          </button>
        </div>
      )}
    </div>
  </div>
</div>
</div>


    <div className="max-w-5xl mx-auto p-5 space-y-6">

      {/* DATE SELECTOR CARD */}
      <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">
        <label className="text-sm font-semibold text-gray-700">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          className="
            w-full mt-2 px-4 py-2 rounded-lg border border-gray-300 
            focus:ring-2 focus:ring-blue-400 focus:outline-none
          "
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* TODAY'S REPORT CARD */}
      <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Daily Report</h2>

          <span
            className={`
              px-3 py-1 text-xs rounded-full font-semibold
              ${
                todayReport?.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : todayReport?.status === "draft"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-200 text-gray-600"
              }
            `}
          >
            {todayReport?.status ? todayReport.status.toUpperCase() : "NOT STARTED"}
          </span>
        </div>

        {todayReport?.summary && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-3">
            {todayReport.summary}
          </p>
        )}

{/* ACTION BUTTON */}
<button
  onClick={handleCreateOrContinue}
  className={`
    w-full mt-4 text-white py-2 rounded-lg font-semibold
    active:scale-95 transition
    ${
      !todayReport
        ? "bg-blue-600 hover:bg-blue-700"           // Create
        : todayReport.status === "draft"
        ? "bg-yellow-500 hover:bg-yellow-600"       // Continue
        : "bg-green-600 hover:bg-green-700"         // View
    }
  `}
>
  {!todayReport
    ? "Create Report"
    : todayReport.status === "draft"
    ? "Continue Report"
    : "View Report"}
</button>

{todayReport?.status === "completed" && todayReport?.pdf_url && (
  <div className="flex justify-center mt-3">
    <a
      href={getPdfHref(todayReport.pdf_url, todayReport.updated_at)}

      target="_blank"
      className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-semibold transition active:scale-95"
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
      Download PDF
    </a>
    
  </div>
)}

        
        
        
      </div>

{/* SUBMITTED REPORTS */}
<div className="mt-6">
  <h3 className="text-xl font-semibold text-gray-800 mb-3">Recent Reports</h3>

  {reports.length === 0 ? (
    <p className="text-gray-500">No reports submitted yet.</p>
  ) : (
    <>
      <div className="space-y-3">
        {reports.slice(0, 3).map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-gray-800">{r.report_date}</p>
              <p
                className={`
                  text-xs font-semibold mt-1 inline-block px-2 py-1 rounded
                  ${
                    r.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }
                `}
              >
                {r.status.toUpperCase()}
              </p>
            </div>

{/* ACTION ICONS */}

<div className="flex items-center gap-6">

  {/* VIEW */}
  <button
    onClick={() => router.push(`/projects/${projectId}/reports/${r.id}`)}
    className="flex flex-col items-center text-indigo-600 hover:text-indigo-800 transition active:scale-95"
  >
    <EyeIcon className="w-5 h-5" />
    <span className="text-[10px] font-medium text-gray-500">View</span>
  </button>

  {/* PDF */}
  {r.pdf_url ? (
    <a
      href={getPdfHref(r.pdf_url, r.updated_at)}

      target="_blank"
      className="flex flex-col items-center text-gray-600 hover:text-gray-800 transition active:scale-95"
    >
      <DocumentArrowDownIcon className="w-5 h-5" />
      <span className="text-[10px] font-medium text-gray-500">PDF</span>
    </a>
  ) : (
    <span className="text-[10px] text-gray-400 italic">Pending</span>
  )}

</div>
            
          </div>
        ))}
      </div>

      {/* VIEW MORE BUTTON */}
      {reports.length > 3 && (
        <button
          onClick={() => router.push(`/projects/${projectId}/reports`)}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95"
        >
          View All Reports →
        </button>
      )}
    </>
  )}
</div>

    </div>
  </div>
);

}
