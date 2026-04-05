"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import {
  EyeIcon,
  DocumentArrowDownIcon
} from "@heroicons/react/24/solid";
import { translations, translateStatus } from "@/lib/i18n";

export default function AllReportsPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectLanguage, setProjectLanguage] = useState<"English" | "Bahasa Melayu">("English");
  const t = translations[projectLanguage];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    setProject(proj);

    if (proj?.output_language === "Bahasa Melayu") {
      setProjectLanguage("Bahasa Melayu");
    } else {
      setProjectLanguage("English");
    }

    const { data: rep } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });

    setReports(rep || []);
    setLoading(false);
  }

  const filteredReports = reports
    .filter((r) =>
      r.report_date.toLowerCase().includes(search.toLowerCase())
    )
    .filter((r) =>
      filter === "all" ? true : r.status === filter
    )
    .sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.report_date).getTime() - new Date(a.report_date).getTime();
      }

      if (sort === "oldest") {
        return new Date(a.report_date).getTime() - new Date(b.report_date).getTime();
      }

      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="h-[env(safe-area-inset-top)]" />

        <div className="p-6 rounded-b-3xl">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
             {/* <button
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
              </button>*/}

              <div>
                <h1 className="text-2xl font-bold">{t.allReports}</h1>
                <p className="text-white text-sm mt-1 opacity-90">
                  {project?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-5 pb-28">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-4">
          <input
            type="text"
            placeholder={t.searchReportsByDate}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="px-4 py-2 rounded-lg border border-gray-300 shadow-sm"
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t.allStatus}</option>
            <option value="completed">{t.completed}</option>
            <option value="draft">{t.draft}</option>
          </select>

          <select
            className="px-4 py-2 rounded-lg border border-gray-300 shadow-sm"
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">{t.newestFirst}</option>
            <option value="oldest">{t.oldestFirst}</option>
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <p className="text-gray-600 animate-pulse">{t.loading}</p>}

          {!loading && filteredReports.length === 0 && (
            <p className="text-gray-500">No matching reports found.</p>
          )}

          {!loading &&
            filteredReports.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex justify-between items-center"
              >
                <div>
                  <p className="text-lg font-semibold text-gray-800">{r.report_date}</p>

                  <span
                    className={`
                      px-3 py-1 text-xs rounded-full font-semibold mt-2 inline-block
                      ${
                        r.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    `}
                  >
                    {translateStatus(r.status, projectLanguage)}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/reports/${r.id}`)}
                    className="flex flex-col items-center text-indigo-600 hover:text-indigo-800 transition active:scale-95"
                  >
                    <EyeIcon className="w-5 h-5" />
                    <span className="text-[10px] font-medium text-gray-500">
                      {t.viewReport}
                    </span>
                  </button>

                  {r.pdf_url ? (
                    <a
                      href={r.pdf_url}
                      target="_blank"
                      className="flex flex-col items-center text-gray-600 hover:text-gray-800 transition active:scale-95"
                    >
                      <DocumentArrowDownIcon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-gray-500">
                        {t.pdf}
                      </span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">
                      {t.pending}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}