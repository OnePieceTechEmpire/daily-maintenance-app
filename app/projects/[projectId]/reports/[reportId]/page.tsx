"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

  const [regenerating, setRegenerating] = useState(false);

  const [report, setReport] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
      const [weather, setWeather] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<
    { name: string; qty: string; status: string; note?: string }[]
  >([]);
    const [workers, setWorkers] = useState({
      partition: 0,
      ceiling: 0,
      mne: 0,
      flooring: 0,
      brickwork: 0,
      carpenter: 0,
      painter: 0,
      plumber: 0,
      others: [] as { label: string; count: number }[],
    });
  

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
setWeather(data.weather || []);
setMaterials(data.materials || []);
setEquipment(data.equipment || []);
  setWorkers(
  data.workers && typeof data.workers === "object"
    ? {
        partition: data.workers.partition ?? 0,
        ceiling: data.workers.ceiling ?? 0,
        mne: data.workers.mne ?? 0,
        flooring: data.workers.flooring ?? 0,
        brickwork: data.workers.brickwork ?? 0,
        carpenter: data.workers.carpenter ?? 0,
        painter: data.workers.painter ?? 0,
        plumber: data.workers.plumber ?? 0,
        others: Array.isArray(data.workers.others)
          ? data.workers.others
          : [],
      }
    : {
        partition: 0,
        ceiling: 0,
        mne: 0,
        flooring: 0,
        brickwork: 0,
        carpenter: 0,
        painter: 0,
        plumber: 0,
        others: [],
      }
);
  }

  // Fetch images
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
    alert("Failed to regenerate PDF");
    return;
  }

  // refresh report to get latest pdf_url
  await loadReport();

  setRegenerating(false);
  alert("PDF regenerated ✅");
}


  if (!report) {
    return <div className="p-6">Loading...</div>;
  }

return (
  <div className="min-h-screen bg-gray-100">

{/* HEADER */}
<div className="bg-blue-900 text-white shadow-lg">

  {/* SAFE AREA TOP */}
  <div className="h-[env(safe-area-inset-top)]" />

  {/* HEADER CONTENT */}
  <div className="p-6 rounded-b-3xl">

    <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-4">

      {/* LEFT: BACK BUTTON + TITLE/DATE */}
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
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <p className="text-white text-sm mt-1 opacity-90">
            {report.report_date}
          </p>
        </div>
      </div>

      {/* RIGHT: EDIT & PDF BUTTONS */}
      <div className="flex items-center gap-2 justify-end flex-wrap w-full sm:w-auto">
        <button
          onClick={() => router.push(`/projects/${projectId}/reports/${reportId}/edit`)}
          className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-3 rounded-xl transition active:scale-95"
        >
          Edit
        </button>

        {report.pdf_url && (
          <a
            href={`${report.pdf_url}?v=${encodeURIComponent(report.updated_at || Date.now())}`}
            target="_blank"
            className="flex items-center gap-2 bg-white text-blue-700 font-semibold py-2 px-4 rounded-xl shadow hover:bg-gray-100 active:scale-95 transition"
          >
            PDF
          </a>
        )}
      </div>

    </div>
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

      <section className="bg-white p-4 rounded-xl shadow">
  <h2 className="font-semibold mb-2">Weather</h2>

  {weather.length === 0 ? (
    <p className="text-gray-500">No weather records</p>
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
  <h2 className="font-semibold mb-2">Materials Delivered</h2>

  {materials.length === 0 ? (
    <p className="text-gray-500">No materials recorded</p>
  ) : (
    <ul className="list-disc ml-4">
      {materials.map((m, i) => (
        <li key={i}>{m.name} ({m.qty})</li>
      ))}
    </ul>
  )}
</section>

<section className="bg-white p-4 rounded-xl shadow">
  <h2 className="font-semibold mb-2">Machinery / Equipment</h2>

  {equipment.length === 0 ? (
    <p className="text-gray-500">No equipment recorded</p>
  ) : (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500">
          <th>Name</th>
          <th>Qty</th>
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
  <h2 className="font-semibold mb-2">Workers</h2>

  <ul className="space-y-1 text-sm">
    <li>Partition: {workers.partition}</li>
    <li>Ceiling: {workers.ceiling}</li>
    <li>M&E: {workers.mne}</li>
    <li>Flooring: {workers.flooring}</li>
    <li>Brickwork: {workers.brickwork}</li>
    <li>Carpenter: {workers.carpenter}</li>
    <li>Painter: {workers.painter}</li>
    <li>Plumber: {workers.plumber}</li>
  </ul>

  {workers.others.length > 0 && (
    <>
      <h3 className="mt-3 font-medium">Others</h3>
      <ul className="ml-4 list-disc">
        {workers.others.map((o, i) => (
          <li key={i}>{o.label}: {o.count}</li>
        ))}
      </ul>
    </>
  )}
</section>

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
