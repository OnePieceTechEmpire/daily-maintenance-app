"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";

type DailyReport = {
  id: string;
  report_date: string;
  status: "draft" | "completed";
};

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarDays(currentMonth: Date) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);

  const startWeekday = (start.getDay() + 6) % 7; // Monday=0
  const daysInMonth = end.getDate();

  const cells: (Date | null)[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

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

    if (error || !data) {
      router.replace("/projects");
      return;
    }

    setProjectName(data.name || "");
  }

  async function loadReports() {
    setLoading(true);

    const { data, error } = await supabase
      .from("daily_reports")
      .select("id, report_date, status")
      .eq("project_id", projectId)
      .order("report_date", { ascending: false });

    if (error) {
      console.error("Failed to load reports:", error);
      setReports([]);
      setLoading(false);
      return;
    }

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

  function goPrevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }

  function goNextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }

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

  function getCellStyle(date: Date | null) {
    if (!date) return "bg-transparent border-transparent";

    const dateKey = formatDateKey(date);
    const report = reportMap.get(dateKey);
    const isToday = dateKey === todayKey;

    if (report?.status === "completed") {
      return isToday
        ? "bg-green-100 border-green-400 text-green-800"
        : "bg-green-50 border-green-200 text-green-700";
    }

    if (report?.status === "draft") {
      return isToday
        ? "bg-yellow-100 border-yellow-400 text-yellow-800"
        : "bg-yellow-50 border-yellow-200 text-yellow-700";
    }

    return isToday
      ? "bg-blue-50 border-blue-300 text-blue-700"
      : "bg-white border-gray-200 text-gray-700";
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="p-6 rounded-b-3xl">
          <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-sm text-blue-100 mt-1">
                {projectName || "Project calendar view"}
              </p>
            </div>


          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-5 pb-28 space-y-5">
        {/* MONTH CONTROLS */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <button
            onClick={goPrevMonth}
            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
          >
            ←
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">
              {formatMonthYear(currentMonth)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tap a date to create or open report
            </p>
          </div>

          <button
            onClick={goNextMonth}
            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
          >
            →
          </button>
        </div>

        {/* LEGEND */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-700">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-700">Today</span>
            </div>
          </div>
        </div>

        {/* CALENDAR GRID */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading calendar...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-bold text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="aspect-square" />;
                  }

                  const dateKey = formatDateKey(date);
                  const report = reportMap.get(dateKey);

                  return (
                    <button
                      key={dateKey}
                      onClick={() => handleDateClick(date)}
                      className={`
                        aspect-square rounded-2xl border p-2 text-left transition active:scale-95
                        flex flex-col justify-between
                        ${getCellStyle(date)}
                      `}
                    >
                      <span className="text-sm font-bold">{date.getDate()}</span>

                      <div className="flex justify-end">
                        {report?.status === "completed" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        )}
                        {report?.status === "draft" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}