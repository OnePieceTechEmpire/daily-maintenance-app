"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/i18n";
import { WORKER_LABEL_MAP } from "@/lib/workerTypes";
import { ChevronLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { DocumentArrowDownIcon } from "@heroicons/react/24/solid";

const weatherEmoji: Record<string, string> = {
  Sunny: "☀️", Cloudy: "⛅", Rain: "🌧️", "Heavy Rain": "⛈️", Thunderstorm: "🌩️",
};

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

  const [regenerating, setRegenerating] = useState(false);
  const [projectLanguage, setProjectLanguage] = useState<"English" | "Bahasa Melayu">("English");
  const [report, setReport] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [weather, setWeather] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [workers, setWorkers] = useState<Record<string, any>>({});
  const [projectWorkerTypes, setProjectWorkerTypes] = useState<string[]>([]);
  const [projectCustomWorkerTypes, setProjectCustomWorkerTypes] = useState<{ key: string; label: string }[]>([]);

  const t = translations[projectLanguage];
  const otherWorkers = Array.isArray(workers.others) ? workers.others : [];

  useEffect(() => {
    loadProjectLanguage();
    loadProjectWorkerTypes();
    loadReport();
    loadImages();
  }, []);

  async function loadProjectLanguage() {
    const { data } = await supabase.from("projects").select("output_language").eq("id", projectId).single();
    if (data?.output_language === "Bahasa Melayu") setProjectLanguage("Bahasa Melayu");
  }

  async function loadProjectWorkerTypes() {
    const { data } = await supabase.from("projects").select("worker_types, custom_worker_types").eq("id", projectId).single();
    setProjectWorkerTypes(Array.isArray(data?.worker_types) ? data.worker_types : []);
    setProjectCustomWorkerTypes(Array.isArray(data?.custom_worker_types) ? data.custom_worker_types : []);
  }

  async function loadReport() {
    const { data } = await supabase.from("daily_reports").select("*").eq("id", reportId).single();
    if (!data) return;
    setReport(data);
    setWeather(Array.isArray(data.weather) ? data.weather : []);
    setMaterials(Array.isArray(data.materials) ? data.materials : []);
    setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
    setWorkers(data.workers && typeof data.workers === "object" ? data.workers : {});
  }

  async function loadImages() {
    const { data } = await supabase.from("report_images").select("*").eq("report_id", reportId);
    setImages(data || []);
  }

  async function regeneratePdf() {
    setRegenerating(true);
    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    if (!res.ok) { setRegenerating(false); alert(t.failedToRegeneratePdf); return; }
    await loadReport();
    setRegenerating(false);
  }

  const sectionLabel = "text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-3";

  // Workers to display (only those with count > 0)
  const activeWorkers = [
    ...projectWorkerTypes
      .filter((key) => Number(workers[key] ?? 0) > 0)
      .map((key) => ({ label: WORKER_LABEL_MAP[key] || key, count: Number(workers[key]) })),
    ...projectCustomWorkerTypes
      .filter((item) => Number(workers[item.key] ?? 0) > 0)
      .map((item) => ({ label: item.label, count: Number(workers[item.key]) })),
    ...otherWorkers
      .filter((item: any) => item?.label?.trim() && Number(item.count) > 0)
      .map((item: any) => ({ label: item.label, count: Number(item.count) })),
  ];

  const totalWorkers = activeWorkers.reduce((sum, w) => sum + w.count, 0);

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-blue-300 hover:text-white transition mb-3 active:scale-[0.98]">
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">Daily Report</span>
              <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">{report.report_date}</h1>
            </div>
            <span className={`mt-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
              report.status === "completed"
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                : "bg-amber-500/20 border-amber-400/30 text-amber-300"
            }`}>
              {report.status === "completed" ? "Completed" : "Draft"}
            </span>
          </div>

          {/* Quick action row */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => router.push(`/projects/${projectId}/reports/${reportId}/edit`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition active:scale-[0.98]"
            >
              <PencilSquareIcon className="w-4 h-4" />
              {t.editReport}
            </button>

            {report.pdf_url && (
              <a
                href={`${report.pdf_url}?v=${encodeURIComponent(report.updated_at || Date.now())}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-blue-900 text-sm font-bold transition active:scale-[0.98] hover:bg-blue-50 shadow-sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                {t.downloadPdf}
              </a>
            )}
          </div>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {/* ── QUICK STATS ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Photos", value: images.length, color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
            { label: "Workers", value: totalWorkers, color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
            { label: "Materials", value: materials.length, color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-3.5 border border-slate-200/70 shadow-sm`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${stat.dot}`} />
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── SUMMARY ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.summary}</span>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-200">
            {report.summary || <span className="text-slate-400 italic">{t.noSummaryProvided}</span>}
          </p>
        </div>

        {/* ── PHOTOS ── */}
        {images.length > 0 && (
          <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
            <span className={sectionLabel}>{t.photos} ({images.length})</span>
            <div className="grid grid-cols-2 gap-3">
              {images.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                  <img src={img.image_url} className="w-full h-40 object-cover" alt={img.caption || t.photos} />
                  {img.caption && (
                    <div className="px-3 py-2 border-t border-slate-100">
                      <p className="text-xs text-slate-600 leading-snug">{img.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKERS ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.workersOnSite}</span>
          {activeWorkers.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t.noWorkersRecorded}</p>
          ) : (
            <div className="space-y-0">
              {activeWorkers.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700">{w.label}</span>
                  <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">{w.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">{totalWorkers}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── WEATHER ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.weatherConditions}</span>
          {weather.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t.noWeatherRecords}</p>
          ) : (
            <div className="space-y-2">
              {weather.map((w, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-xl">{weatherEmoji[w.condition] || "🌤️"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{w.condition}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{w.from} – {w.to}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MATERIALS ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.materialsDelivered}</span>
          {materials.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t.noMaterialsRecorded}</p>
          ) : (
            <div className="space-y-0">
              {materials.map((m, i) => (
                <div key={i} className="py-2.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                    <span className="text-sm font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {m.qty}{m.unit ? ` ${m.unit}` : ""}
                    </span>
                  </div>
                  {m.note && <p className="text-xs text-slate-400 mt-0.5">{m.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── EQUIPMENT ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.machineryEquipment}</span>
          {equipment.length === 0 ? (
            <p className="text-sm text-slate-400 italic">{t.noEquipmentRecorded}</p>
          ) : (
            <div className="space-y-0">
              {equipment.map((e, i) => (
                <div key={i} className="py-2.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{e.name}</span>
                    <span className="text-sm font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {e.qty ? `× ${e.qty}` : "—"}
                    </span>
                  </div>
                  {e.note && <p className="text-xs text-slate-400 mt-0.5">{e.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── PDF / REGENERATE ── */}
        {report.pdf_url ? (
          <div className="space-y-3">
            <a
              href={`${report.pdf_url}?v=${encodeURIComponent(report.updated_at || Date.now())}`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold text-sm min-h-11 active:scale-[0.98] transition hover:bg-red-100"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              {t.downloadPdf}
            </a>
            <button
              onClick={regeneratePdf}
              disabled={regenerating}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50 disabled:opacity-60"
            >
              {regenerating
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />{t.regeneratingPdf}</span>
                : t.regeneratePdf}
            </button>
          </div>
        ) : (
          <button
            onClick={regeneratePdf}
            disabled={regenerating}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm min-h-11 active:scale-[0.98] transition disabled:opacity-60"
          >
            {regenerating
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.regeneratingPdf}</span>
              : t.regeneratePdf}
          </button>
        )}

        {/* ── BACK TO DASHBOARD ── */}
        <button
          onClick={() => router.push(`/projects/${projectId}/dashboard`)}
          className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50"
        >
          {t.backToDashboard}
        </button>

      </div>
    </div>
  );
}