"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import { EyeIcon, DocumentArrowDownIcon } from "@heroicons/react/24/solid";
import { translations, translateStatus } from "@/lib/i18n";

export default function AllReportsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectLanguage, setProjectLanguage] = useState<"English" | "Bahasa Melayu">("English");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const t = translations[projectLanguage];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);

    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    setProject(proj);
    setProjectLanguage(proj?.output_language === "Bahasa Melayu" ? "Bahasa Melayu" : "English");

    const { data: rep } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });

    setReports(rep || []);
    setLoading(false);
  }

  function getPdfHref(pdfUrl: string, updatedAt?: string | null) {
    const v = updatedAt ? encodeURIComponent(updatedAt) : Date.now();
    return `${pdfUrl}?v=${v}`;
  }

  const filteredReports = useMemo(() =>
    reports
      .filter((r) => r.report_date.toLowerCase().includes(search.toLowerCase()))
      .filter((r) => filter === "all" ? true : r.status === filter)
      .sort((a, b) =>
        sort === "newest"
          ? new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
          : new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
      ),
    [reports, search, filter, sort]
  );

  // Summary counts
  const completedCount = reports.filter((r) => r.status === "completed").length;
  const draftCount = reports.filter((r) => r.status === "draft").length;

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">
          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            {project?.name || "Project"}
          </span>
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">
            {t.allReports}
          </h1>
          <p className="text-sm text-blue-200 mt-1.5 opacity-90">
            {reports.length} {reports.length === 1 ? "report" : "reports"} total
          </p>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {/* SUMMARY STATS */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: reports.length, color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
              { label: "Completed", value: completedCount, color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
              { label: "Draft", value: draftCount, color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 border border-slate-200/70 shadow-sm`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    {stat.label}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
            Search & Filter
          </span>

          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder={t.searchReportsByDate}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter + Sort row */}
          <div className="grid grid-cols-2 gap-2">
            <select
              className={inputClass}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t.allStatus}</option>
              <option value="completed">{t.completed}</option>
              <option value="draft">{t.draft}</option>
            </select>

            <select
              className={inputClass}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">{t.newestFirst}</option>
              <option value="oldest">{t.oldestFirst}</option>
            </select>
          </div>
        </div>

        {/* REPORTS LIST */}
        <div>
          <div className="px-0.5 mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {filter === "all" ? "All Reports" : filter === "completed" ? "Completed" : "Drafts"}
            </span>
            {filteredReports.length !== reports.length && (
              <span className="text-[10px] font-bold text-blue-500">
                {filteredReports.length} result{filteredReports.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">{t.loading}</span>
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && filteredReports.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 text-center">
              <p className="text-slate-400 text-sm font-medium">
                {search || filter !== "all"
                  ? "No reports match your search."
                  : "No reports yet. Tap the dashboard to create one."}
              </p>
            </div>
          )}

          {/* Report cards */}
          {!loading && filteredReports.length > 0 && (
            <div className="space-y-2.5">
              {filteredReports.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3.5 flex justify-between items-center"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{r.report_date}</p>
                    <span
                      className={`
                        inline-block mt-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border
                        ${r.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      `}
                    >
                      {translateStatus(r.status, projectLanguage).toUpperCase()}
                    </span>
                  </div>

                  {/* ACTION ICONS */}
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => router.push(`/projects/${projectId}/reports/${r.id}`)}
                      className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 active:bg-indigo-100 transition"
                    >
                      <EyeIcon className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5 text-indigo-500">View</span>
                    </button>

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
          )}
        </div>

      </div>

      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}