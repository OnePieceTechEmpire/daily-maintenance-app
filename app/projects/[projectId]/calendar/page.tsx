"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

type DailyReport = {
  id: string;
  report_date: string;
  status: "draft" | "completed";
};

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCalendarDays(currentMonth: Date) {
  const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startWeekday = (start.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = end.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++)
    cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function ProjectCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    loadProject();
    loadReports();
  }, [projectId]);

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    if (error || !data) { router.replace("/projects"); return; }
    setProjectName(data.name || "");
  }

  async function loadReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from("daily_reports")
      .select("id, report_date, status")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });

    if (error) { setReports([]); setLoading(false); return; }
    setReports((data || []) as DailyReport[]);
    setLoading(false);
  }

  const reportMap = useMemo(() => {
    const map = new Map<string, DailyReport>();
    reports.forEach((r) => map.set(r.report_date, r));
    return map;
  }, [reports]);

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const todayKey = formatDateKey(new Date());

  // Stats for current month
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let completed = 0;
    let draft = 0;
    reports.forEach((r) => {
      const d = new Date(r.report_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (r.status === "completed") completed++;
        else if (r.status === "draft") draft++;
      }
    });
    return { completed, draft, total: completed + draft };
  }, [reports, currentMonth]);

  function goPrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  function goToday() {
    setCurrentMonth(new Date());
  }

  const isCurrentMonth =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth();

  function handleDateClick(date: Date) {
    const dateKey = formatDateKey(date);
    const existingReport = reportMap.get(dateKey);
    if (!existingReport) {
      router.push(`/projects/${projectId}/reports/new?date=${dateKey}`);
      return;
    }
    if (existingReport.status === "draft") {
      router.push(`/projects/${projectId}/reports/${existingReport.id}/edit`);
      return;
    }
    router.push(`/projects/${projectId}/reports/${existingReport.id}`);
  }

  function getCellStyle(date: Date) {
    const dateKey = formatDateKey(date);
    const report = reportMap.get(dateKey);
    const isToday = dateKey === todayKey;

    if (report?.status === "completed") {
      return isToday
        ? "bg-emerald-100 border-emerald-400 text-emerald-800"
        : "bg-emerald-50 border-emerald-200 text-emerald-700";
    }
    if (report?.status === "draft") {
      return isToday
        ? "bg-amber-100 border-amber-400 text-amber-800"
        : "bg-amber-50 border-amber-200 text-amber-700";
    }
    return isToday
      ? "bg-blue-50 border-blue-400 text-blue-700"
      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
  }

  function getDotColor(status: string) {
    if (status === "completed") return "bg-emerald-500";
    if (status === "draft") return "bg-amber-400";
    return "";
  }

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">
          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            Project Calendar
          </span>
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">
            {projectName || "Calendar"}
          </h1>
          <p className="text-sm text-blue-200 mt-1.5 opacity-90">
            Tap a date to create or open a report
          </p>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {/* MONTH STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Completed", value: monthStats.completed, color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
            { label: "Draft", value: monthStats.draft, color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
            { label: "Total", value: monthStats.total, color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
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

        {/* MONTH NAVIGATOR */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between gap-3">
          <button
            onClick={goPrevMonth}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition shrink-0"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          <div className="text-center flex-1">
            <h2 className="text-base font-bold text-slate-800">
              {formatMonthYear(currentMonth)}
            </h2>
            {!isCurrentMonth && (
              <button
                onClick={goToday}
                className="mt-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition"
              >
                Back to today
              </button>
            )}
          </div>

          <button
            onClick={goNextMonth}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition shrink-0"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* CALENDAR GRID */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading calendar...</span>
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1.5">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((date, index) => {
                  if (!date) return <div key={index} className="aspect-square" />;

                  const dateKey = formatDateKey(date);
                  const report = reportMap.get(dateKey);
                  const isToday = dateKey === todayKey;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => handleDateClick(date)}
                      className={`
                        aspect-square rounded-xl border transition active:scale-95
                        flex flex-col items-center justify-center gap-0.5 relative
                        ${getCellStyle(date)}
                      `}
                    >
                      {/* Today ring */}
                      {isToday && (
                        <span className="absolute inset-0 rounded-xl ring-2 ring-blue-400 ring-offset-1 pointer-events-none" />
                      )}

                      <span className={`text-sm font-bold leading-none ${isToday ? "text-blue-700" : ""}`}>
                        {date.getDate()}
                      </span>

                      {report && (
                        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(report.status)}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* LEGEND */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl px-5 py-4">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-3">
            Legend
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {[
              { dot: "bg-emerald-500", label: "Completed report" },
              { dot: "bg-amber-400", label: "Draft / in progress" },
              { dot: "bg-blue-400 ring-2 ring-blue-400 ring-offset-1", label: "Today" },
              { dot: "bg-slate-200", label: "No report" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                <span className="text-xs font-medium text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}