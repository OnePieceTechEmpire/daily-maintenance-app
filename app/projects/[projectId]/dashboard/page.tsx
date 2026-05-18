"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/useAuthGuard";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import {
  EyeIcon,
    DocumentArrowDownIcon
} from "@heroicons/react/24/solid";
import { translations, getProjectLanguage, translateStatus } from "@/lib/i18n";

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
  const { userId, checking } = useAuthGuard();
  const lang = getProjectLanguage(project);
const t = translations[lang];


useEffect(() => {
  loadProject();
}, []);

useEffect(() => {
  if (project?.id) {
    loadReports();
  }
}, [project?.id]);

  useEffect(() => {
    loadReportForSelectedDate();
  }, [selectedDate, reports]);

async function loadProject() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  // ✅ If RLS blocks it, data will be null (or error)
  if (error || !data) {
    console.warn("No access / project not found:", error);
    router.replace("/projects"); // kick user out
    return;
  }

  setProject(data);
}

async function loadReports() {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("report_date", { ascending: false });

  // If blocked, return empty and also kick out (optional)
  if (error) {
    console.warn("Reports blocked:", error);
    setReports([]);
    return;
  }

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
  <div className="min-h-screen bg-slate-100">

    {/* HEADER */}
    <div className="bg-blue-900 text-white">

      {/* SAFE AREA TOP */}
      <div className="h-[env(safe-area-inset-top)]" />

      {/* HEADER CONTENT */}
      <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">
        <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
          Site Dashboard
        </span>
        <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">
          {project?.name || "Loading..."}
        </h1>
        <p className="text-sm text-blue-200 mt-1.5 leading-relaxed opacity-90">
          {project?.description}
        </p>
      </div>

      <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
    </div>

    <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

      {/* DATE SELECTOR CARD */}
      <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-4">
        <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-2">
          {t.selectDate}
        </label>
        <input
          type="date"
          value={selectedDate}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50
            text-slate-800 font-medium min-h-11
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* TODAY'S REPORT CARD */}
      <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">

        <div className="px-4 pt-4 pb-3.5 flex justify-between items-start border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-0.5">
              Report Status
            </span>
            <h2 className="text-base font-bold text-slate-800">{t.dailyReport}</h2>
          </div>
          <span
            className={`
              mt-0.5 px-3 py-1 text-[10px] rounded-full font-bold tracking-wider uppercase border
              ${
                todayReport?.status === "completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : todayReport?.status === "draft"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }
            `}
          >
            {todayReport?.status
              ? translateStatus(todayReport.status, lang).toUpperCase()
              : t.notStarted.toUpperCase()}
          </span>
        </div>

        <div className="px-4 py-4 space-y-3">
          {todayReport?.summary && (
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {todayReport.summary}
            </p>
          )}

          {/* ACTION BUTTON */}
          <button
            onClick={handleCreateOrContinue}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm tracking-wide min-h-11 text-white
              active:scale-[0.98] transition-all duration-150
              ${
                !todayReport
                  ? "bg-blue-600 hover:bg-blue-700"
                  : todayReport.status === "draft"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }
            `}
          >
            {!todayReport
              ? t.createReport
              : todayReport.status === "draft"
              ? t.continueReport
              : t.viewReport}
          </button>

          {todayReport?.status === "completed" && todayReport?.pdf_url && (
            <div className="flex justify-center mt-1">
              <a
                href={getPdfHref(todayReport.pdf_url, todayReport.updated_at)}
                target="_blank"
                className="flex items-center gap-2 w-full justify-center py-3 rounded-xl
                  border border-red-200 bg-red-50 text-red-700 font-semibold text-sm
                  min-h-11 active:scale-[0.98] transition hover:bg-red-100"
              >
                {/* PDF Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="w-4 h-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a2.625 2.625 0 00-2.625-2.625H7.125A2.625 2.625 0 004.5 11.625v6.75A2.625 2.625 0 007.125 21h9.75A2.625 2.625 0 0019.5 18.375V16.5M12 6.75V15m0 0l-3-3m3 3l3-3"
                  />
                </svg>
                {t.downloadPdf}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SUBMITTED REPORTS */}
      <div>
        <div className="px-0.5 mb-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-0.5">
            Recent Activity
          </span>
          <h3 className="text-base font-bold text-slate-800">{t.recentReports}</h3>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm font-medium">{t.noReportsYet}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {reports.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3.5 flex justify-between items-center"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{r.report_date}</p>
                    <span
                      className={`
                        inline-block mt-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border
                        ${
                          r.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      `}
                    >
                      {translateStatus(r.status, lang).toUpperCase()}
                    </span>
                  </div>

                  {/* ACTION ICONS */}
                  <div className="flex items-center gap-2 ml-3 shrink-0">

                    {/* VIEW */}
                    <button
                      onClick={() => router.push(`/projects/${projectId}/reports/${r.id}`)}
                      className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 active:bg-indigo-100 transition"
                    >
                      <EyeIcon className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5 text-indigo-500">View</span>
                    </button>

                    {/* PDF */}
                    {r.pdf_url ? (
                      <a
                        href={getPdfHref(r.pdf_url, r.updated_at)}
                        target="_blank"
                        className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200 transition"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold mt-0.5 text-slate-500">PDF</span>
                      </a>
                    ) : (
                      <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50">
                        <span className="text-[9px] text-slate-400 italic leading-tight text-center px-1">{t.pending}</span>
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>

            {/* VIEW MORE BUTTON */}
            {reports.length > 3 && (
              <button
                onClick={() => router.push(`/projects/${projectId}/reports`)}
                className="mt-3 w-full bg-white border border-slate-200 text-slate-700 px-4 py-3.5 rounded-xl
                  hover:bg-slate-50 active:scale-[0.98] transition text-sm font-semibold min-h-11"
              >
                {t.viewAllReports}
              </button>
            )}
          </>
        )}
      </div>

    </div>
    <ProjectBottomNav projectId={projectId} />
  </div>
);

}
