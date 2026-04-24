"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { translations } from "@/lib/i18n";
import { WORKER_LABEL_MAP } from "@/lib/workerTypes";

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

  const [regenerating, setRegenerating] = useState(false);
  const [projectLanguage, setProjectLanguage] = useState<"English" | "Bahasa Melayu">("English");
  const t = translations[projectLanguage];

  const [report, setReport] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [weather, setWeather] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [equipment, setEquipment] = useState<
    { name: string; qty: string; status: string; note?: string }[]
  >([]);
const [workers, setWorkers] = useState<Record<string, number>>({});
const [projectWorkerTypes, setProjectWorkerTypes] = useState<string[]>([]);
const [projectCustomWorkerTypes, setProjectCustomWorkerTypes] = useState<
  { key: string; label: string }[]
>([]);
const otherWorkers = Array.isArray(workers.others)
  ? workers.others
  : [];

async function loadProjectWorkerTypes() {
  const { data, error } = await supabase
    .from("projects")
    .select("worker_types, custom_worker_types")
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("Failed to load project worker types:", error);
    return;
  }

  setProjectWorkerTypes(Array.isArray(data?.worker_types) ? data.worker_types : []);
  setProjectCustomWorkerTypes(
    Array.isArray(data?.custom_worker_types) ? data.custom_worker_types : []
  );
}

  async function loadProjectLanguage() {
    const { data, error } = await supabase
      .from("projects")
      .select("output_language")
      .eq("id", projectId)
      .single();

    if (!error && data?.output_language === "Bahasa Melayu") {
      setProjectLanguage("Bahasa Melayu");
    } else {
      setProjectLanguage("English");
    }
  }

  useEffect(() => {
    loadProjectLanguage();
  loadProjectWorkerTypes();
    loadReport();
    loadImages();
  }, []);

  async function loadReport() {
    const { data } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!data) return;

    setReport(data);
    setWeather(Array.isArray(data.weather) ? data.weather : []);
    setMaterials(Array.isArray(data.materials) ? data.materials : []);
    setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
setWorkers(
  data.workers && typeof data.workers === "object"
    ? data.workers
    : {}
);
  }

  async function loadImages() {
    const { data } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    setImages(data || []);
  }

  async function regeneratePdf() {
    setRegenerating(true);

    const res = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });

    if (!res.ok) {
      setRegenerating(false);
      alert(t.failedToRegeneratePdf);
      return;
    }

    await loadReport();
    setRegenerating(false);
    alert(t.pdfRegenerated);
  }

  if (!report) {
    return <div className="p-6">{t.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="p-6 rounded-b-3xl">
          <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
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
                <h1 className="text-2xl font-bold">{t.dailyReport}</h1>
                <p className="text-white text-sm mt-1 opacity-90">
                  {report.report_date}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end flex-wrap w-full sm:w-auto">
              <button
                onClick={() => router.push(`/projects/${projectId}/reports/${reportId}/edit`)}
                className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-3 rounded-xl transition active:scale-95"
              >
                {t.editReport}
              </button>

              {report.pdf_url && (
                <a
                  href={`${report.pdf_url}?v=${encodeURIComponent(report.updated_at || Date.now())}`}
                  target="_blank"
                  className="flex items-center gap-2 bg-white text-blue-700 font-semibold py-2 px-4 rounded-xl shadow hover:bg-gray-100 active:scale-95 transition"
                >
                  {t.downloadPdf}
                </a>
              )}


            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5 space-y-10">
        <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{t.summary}</h2>
          <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
            {report.summary || t.noSummaryProvided}
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 p-5 rounded-2xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.photos}</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white"
              >
                <img
                  src={img.image_url}
                  className="w-full h-40 object-cover"
                  alt={img.caption || t.photos}
                />
                <div className="p-3 bg-gray-50 border-t">
                  <p className="text-sm text-gray-700">{img.caption || t.noCaption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">{t.weatherConditions}</h2>
          {weather.length === 0 ? (
            <p className="text-gray-500">{t.noWeatherRecords}</p>
          ) : (
            <ul className="space-y-2">
              {weather.map((w, i) => (
                <li key={i} className="text-sm">
                  ⏱ {w.from} – {w.to} : {w.condition}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">{t.materialsDelivered}</h2>
          {materials.length === 0 ? (
            <p className="text-gray-500">{t.noMaterialsRecorded}</p>
          ) : (
            <ul className="list-disc ml-4">
              {materials.map((m, i) => (
                <li key={i}>
                  {m.name} ({m.qty}{m.unit ? ` ${m.unit}` : ""})
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-2">{t.machineryEquipment}</h2>
          {equipment.length === 0 ? (
            <p className="text-gray-500">{t.noEquipmentRecorded}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th>{t.name}</th>
                  <th>{t.qty}</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((e, i) => (
                  <tr key={i}>
                    <td>{e.name}</td>
                    <td>{e.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

<section className="bg-white p-4 rounded-xl shadow">
  <h2 className="font-semibold mb-2">{t.workersOnSite}</h2>

  {projectWorkerTypes.length === 0 && projectCustomWorkerTypes.length === 0 ? (
    <p className="text-gray-500">{t.noWorkersRecorded || "No workers recorded"}</p>
  ) : (
    
<ul className="space-y-1 text-sm">
  {projectWorkerTypes
    .filter((key) => Number(workers[key] ?? 0) > 0)
    .map((key) => (
      <li key={key}>
        {WORKER_LABEL_MAP[key] || key}: {workers[key]}
      </li>
    ))}

  {projectCustomWorkerTypes
    .filter((item) => Number(workers[item.key] ?? 0) > 0)
    .map((item) => (
      <li key={item.key}>
        {item.label}: {workers[item.key]}
      </li>
    ))}

{otherWorkers
  .filter((item) => item?.label?.trim() && Number(item.count) > 0)
  .map((item, index) => (
    <li key={`other-${index}`}>
      {item.label}: {item.count}
    </li>
  ))}
</ul>
  )}
</section>

        <div className="pb-10">
          <button
            onClick={() => router.push(`/projects/${projectId}/dashboard`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-semibold shadow active:scale-95 transition"
          >
            {t.backToDashboard}
          </button>
        </div>
      </div>
    </div>
  );
}