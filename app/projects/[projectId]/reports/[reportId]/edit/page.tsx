"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import {
  SparklesIcon, CameraIcon, PhotoIcon,
  TrashIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon,
} from "@heroicons/react/24/solid";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { translations } from "@/lib/i18n";
import { WORKER_LABEL_MAP } from "@/lib/workerTypes";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

type ExtraWorker = { label: string; count: number };
type ReportWorkers = { [key: string]: number | ExtraWorker[] | undefined; others?: ExtraWorker[] };

const weatherOptions = [
  { value: "Sunny", emoji: "☀️" },
  { value: "Cloudy", emoji: "⛅" },
  { value: "Rain", emoji: "🌧️" },
  { value: "Heavy Rain", emoji: "⛈️" },
  { value: "Thunderstorm", emoji: "🌩️" },
];

export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

  const [reportStatus, setReportStatus] = useState<"draft" | "completed">("draft");
  const [reportDate, setReportDate] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [rotating, setRotating] = useState<Record<string, boolean>>({});
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
  const [weather, setWeather] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<{ name: string; qty: string; status: string; note?: string }[]>([]);
  const [workers, setWorkers] = useState<ReportWorkers>({ others: [] });
  const [projectWorkerTypes, setProjectWorkerTypes] = useState<string[]>([]);
  const [projectCustomWorkerTypes, setProjectCustomWorkerTypes] = useState<{ key: string; label: string }[]>([]);
  const [projectLanguage, setProjectLanguage] = useState<"English" | "Bahasa Melayu">("English");

  const t = translations[projectLanguage];

  useEffect(() => {
    loadProjectLanguage();
    loadProjectWorkerTypes();
    loadReport();
    loadImages();
  }, []);

  useEffect(() => {
    const drafts: Record<string, string> = {};
    images.forEach((img) => { drafts[img.id] = img.caption || ""; });
    setCaptionDrafts(drafts);
  }, [images]);

  async function loadProjectLanguage() {
    const { data } = await supabase.from("projects").select("output_language").eq("id", projectId).single();
    if (data?.output_language === "Bahasa Melayu") setProjectLanguage("Bahasa Melayu");
  }

  async function loadProjectWorkerTypes() {
    const { data } = await supabase.from("projects").select("worker_types, custom_worker_types").eq("id", projectId).single();
    const selectedTypes = Array.isArray(data?.worker_types) ? data.worker_types : [];
    const customTypes = Array.isArray(data?.custom_worker_types) ? data.custom_worker_types : [];
    setProjectWorkerTypes(selectedTypes);
    setProjectCustomWorkerTypes(customTypes);
    setWorkers((prev) => {
      const updated = { ...prev };
      selectedTypes.forEach((key: string) => { if (updated[key] === undefined) updated[key] = 0; });
      customTypes.forEach((item: any) => { if (item?.key && updated[item.key] === undefined) updated[item.key] = 0; });
      return updated;
    });
  }

  async function loadReport() {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("summary, report_date, status, weather, workers, materials, equipment")
      .eq("id", reportId)
      .single();
    if (error) return;
    setReportStatus((data.status as any) || "draft");
    setSummary(data.summary || "");
    setReportDate(data.report_date);
    setWeather(Array.isArray(data.weather) ? data.weather : []);
    setWorkers(data.workers && typeof data.workers === "object" ? data.workers : { others: [] });
    setMaterials(Array.isArray(data.materials) ? data.materials : []);
    setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
  }

  async function loadImages() {
    const { data } = await supabase.from("report_images").select("*").eq("report_id", reportId);
    setImages(data || []);
  }

  async function autosaveExtraFields(updated?: Partial<any>) {
    if (!reportId) return;
    await supabase.from("daily_reports").update({
      workers, weather, materials, equipment,
      ...(reportStatus === "draft" ? { status: "draft" } : {}),
      ...updated,
    }).eq("id", reportId);
  }

  async function saveSummary(text: string) {
    setSummary(text);
    await supabase.from("daily_reports").update({ summary: text }).eq("id", reportId);
  }

  async function saveCaption(imageId: string) {
    const caption = captionDrafts[imageId] || "";
    await supabase.from("report_images").update({ caption }).eq("id", imageId);
    setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, caption } : img));
  }

  async function updateCaption(id: string, caption: string) {
    await supabase.from("report_images").update({ caption }).eq("id", id);
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, caption } : img));
  }

  async function uploadImages(e: any) {
    if (!isOnline) return alert("No internet connection.");
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) await handleSingleUpload(file);
    setUploading(false);
  }

  async function handleSingleUpload(originalFile: File) {
    try {
      let file = originalFile;
      try { file = await imageCompression(originalFile, { maxSizeMB: 0.4, maxWidthOrHeight: 1600, useWebWorker: true }); } catch {}
      const filePath = `${reportId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("report-images").upload(filePath, file);
      if (uploadError) return alert(t.uploadFailed);
      const url = `https://wnvkfycjjuxjezxggcpg.supabase.co/storage/v1/object/public/report-images/${filePath}`;
      const { data: imageRow } = await supabase.from("report_images").insert([{ report_id: reportId, image_url: url, caption: "" }]).select().single();
      setImages((prev) => [...prev, imageRow]);
    } catch (err) { console.error(err); }
  }

  async function deleteImage(img: any) {
    if (!confirm(t.deleteImageConfirm)) return;
    const prefix = "public/report-images/";
    const index = img.image_url.indexOf(prefix);
    if (index === -1) return;
    const path = img.image_url.substring(index + prefix.length);
    await supabase.storage.from("report-images").remove([path]);
    await supabase.from("report_images").delete().eq("id", img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  async function rotateAndReplaceImage(img: any, direction: "left" | "right") {
    setRotating((p) => ({ ...p, [img.id]: true }));
    try {
      const res = await fetch(img.image_url);
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const imgEl = new Image();
      await new Promise<void>((resolve, reject) => { imgEl.onload = () => resolve(); imgEl.onerror = reject; imgEl.src = dataUrl; });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = imgEl.height; canvas.height = imgEl.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(((direction === "right" ? 90 : -90) * Math.PI) / 180);
      ctx.drawImage(imgEl, -imgEl.width / 2, -imgEl.height / 2);
      const rotatedBlob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9));
      const newPath = `${reportId}/${Date.now()}-rotated.jpg`;
      await supabase.storage.from("report-images").upload(newPath, rotatedBlob, { contentType: "image/jpeg", upsert: true, cacheControl: "0" });
      const newUrl = `https://wnvkfycjjuxjezxggcpg.supabase.co/storage/v1/object/public/report-images/${newPath}`;
      await supabase.from("report_images").update({ image_url: newUrl }).eq("id", img.id);
      setImages((prev) => prev.map((x) => x.id === img.id ? { ...x, image_url: newUrl } : x));
      const prefix = "public/report-images/";
      const idx = img.image_url.indexOf(prefix);
      if (idx !== -1) await supabase.storage.from("report-images").remove([img.image_url.substring(idx + prefix.length)]);
    } catch { alert("Rotate failed"); }
    finally { setRotating((p) => ({ ...p, [img.id]: false })); }
  }

  async function cleanSummaryAndCaptions() {
    if (!isOnline) return alert("No internet connection.");
    const hasSummary = summary.trim().length > 0;
    const nonEmptyCaptionIds = Object.keys(captionDrafts).filter((id) => (captionDrafts[id] || "").trim().length > 0);
    if (!hasSummary && nonEmptyCaptionIds.length === 0) return alert(t.nothingToCleanYet);
    setCleaning(true);
    try {
      if (hasSummary) {
        const res = await fetch("/api/clean-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "summary", text: summary }) });
        const data = await res.json();
        setSummary(data.cleaned || summary);
        await saveSummary(data.cleaned || summary);
      }
      for (const imageId of nonEmptyCaptionIds) {
        const res = await fetch("/api/clean-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "caption", text: captionDrafts[imageId] }) });
        const data = await res.json();
        setCaptionDrafts((prev) => ({ ...prev, [imageId]: data.cleaned || captionDrafts[imageId] }));
        await updateCaption(imageId, data.cleaned || captionDrafts[imageId]);
      }
    } finally { setCleaning(false); }
  }

  async function submitReport() {
    if (!isOnline) return alert("No internet connection.");
    setLoading(true);
    await supabase.from("daily_reports").update({ summary, workers, weather, materials, equipment, status: "completed" }).eq("id", reportId);
    const res = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId }) });
    setLoading(false);
    if (!res.ok) {
      alert(t.reportCompletedPdfFailed);
      router.push(`/projects/${projectId}/dashboard`);
      return;
    }
    router.push(`/projects/${projectId}/dashboard`);
  }

  async function regeneratePdf() {
    if (!isOnline) return alert("No internet connection.");
    setRegenerating(true);
    await supabase.from("daily_reports").update({ summary, workers, weather, materials, equipment, status: "completed" }).eq("id", reportId);
    const res = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId }) });
    setRegenerating(false);
    if (!res.ok) return alert(t.failedToRegeneratePdf);
    setReportStatus("completed");
    router.push(`/projects/${projectId}/dashboard`);
  }

  const sectionLabel = "text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-3";
  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm";

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
          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            {reportStatus === "completed" ? "Completed Report" : "Edit Report"}
          </span>
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">{t.editReport}</h1>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-sm text-blue-200 opacity-90">{reportDate}</p>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-bold tracking-wider uppercase">Offline</span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                reportStatus === "completed"
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                  : "bg-amber-500/20 border-amber-400/30 text-amber-300"
              }`}>
                {reportStatus === "completed" ? "Completed" : "Draft"}
              </span>
            </div>
          </div>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {/* ── UPLOAD IMAGES ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className={sectionLabel}>{t.uploadImages}</span>
            {uploading ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {t.uploadingImages}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{t.ready}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="group relative overflow-hidden cursor-pointer rounded-2xl p-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm active:scale-[0.98] transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><CameraIcon className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-bold leading-tight">{t.camera}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">{t.cameraSubtitle}</p>
                </div>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={uploadImages} className="hidden" />
            </label>
            <label className="cursor-pointer rounded-2xl p-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0"><PhotoIcon className="w-5 h-5 text-slate-600" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{t.gallery}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.gallerySubtitle}</p>
                </div>
              </div>
              <input type="file" accept="image/*" multiple onChange={uploadImages} className="hidden" />
            </label>
          </div>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">{t.cameraTip}</p>
        </div>

        {/* ── IMAGE GRID ── */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => {
              const isRotating = !!rotating?.[img.id];
              return (
                <div key={img.id} className="bg-white border border-slate-200/70 shadow-sm rounded-2xl overflow-hidden">
                  <div className="relative bg-slate-100">
                    <img src={img.image_url} alt="Site" className="w-full h-44 object-contain" />
                    <button type="button" onClick={() => deleteImage(img)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center active:scale-95 transition shadow">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-x-0 bottom-1.5 px-1.5">
                      <div className="flex gap-1 bg-black/60 backdrop-blur rounded-xl p-1">
                        <button type="button" disabled={isRotating} onClick={() => rotateAndReplaceImage(img, "left")}
                          className="flex-1 flex items-center justify-center gap-1 text-white text-[10px] font-semibold py-1.5 rounded-lg hover:bg-white/10 active:scale-95 disabled:opacity-50 transition">
                          <ArrowUturnLeftIcon className="w-3 h-3" />{isRotating ? "..." : t.rotateLeft}
                        </button>
                        <button type="button" disabled={isRotating} onClick={() => rotateAndReplaceImage(img, "right")}
                          className="flex-1 flex items-center justify-center gap-1 text-white text-[10px] font-semibold py-1.5 rounded-lg hover:bg-white/10 active:scale-95 disabled:opacity-50 transition">
                          <ArrowUturnRightIcon className="w-3 h-3" />{isRotating ? "..." : t.rotateRight}
                        </button>
                        <button type="button" onClick={() => router.push(`/projects/${projectId}/reports/${reportId}/annotate/${img.id}`)}
                          className="flex-1 flex items-center justify-center text-white text-[10px] font-semibold py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 active:scale-95 transition">
                          ✏️ {t.annotate}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <input type="text" placeholder={t.addCaptionPlaceholder}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs min-h-9 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={captionDrafts[img.id] || ""}
                      onChange={(e) => setCaptionDrafts((prev) => ({ ...prev, [img.id]: e.target.value }))}
                      onBlur={() => saveCaption(img.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SUMMARY ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.summary}</span>
          <textarea className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
            value={summary} onChange={(e) => saveSummary(e.target.value)} placeholder={t.updateSummaryPlaceholder} />
          <button onClick={cleanSummaryAndCaptions} disabled={cleaning}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl min-h-11 active:scale-[0.98] transition disabled:opacity-60">
            {cleaning
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.improvingSummary}</>
              : <><SparklesIcon className="w-4 h-4" />{t.cleanSummaryWithAi}</>}
          </button>
        </div>

        {/* ── WORKERS ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.workersOnSite}</span>
          {projectWorkerTypes.length === 0 && projectCustomWorkerTypes.length === 0 ? (
            <p className="text-sm text-slate-400">No worker types configured for this project.</p>
          ) : (
            <div className="space-y-2">
              {[...projectWorkerTypes.map((key) => ({ key, label: WORKER_LABEL_MAP[key] || key })),
                ...projectCustomWorkerTypes.map((item) => ({ key: item.key, label: item.label }))
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700 flex-1 leading-snug">{label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { const val = Math.max(0, Number(workers[key] ?? 0) - 1); const updated = { ...workers, [key]: val }; setWorkers(updated); autosaveExtraFields({ workers: updated }); }}
                      className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-lg flex items-center justify-center active:bg-slate-200 transition">−</button>
                    <span className="w-8 text-center font-bold text-slate-800 text-sm">{Number(workers[key] ?? 0)}</span>
                    <button type="button" onClick={() => { const val = Number(workers[key] ?? 0) + 1; const updated = { ...workers, [key]: val }; setWorkers(updated); autosaveExtraFields({ workers: updated }); }}
                      className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center active:bg-blue-200 transition">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{t.others}</p>
            {(workers.others || []).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input type="text" placeholder="Worker type" value={item.label}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm min-h-10 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  onChange={(e) => {
                    setWorkers((prev) => {
                      const updatedOthers = [...(prev.others || [])];
                      updatedOthers[index] = { ...updatedOthers[index], label: e.target.value };
                      const updated = { ...prev, others: updatedOthers };
                      autosaveExtraFields({ workers: updated }); return updated;
                    });
                  }} />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => { setWorkers((prev) => { const updatedOthers = [...(prev.others || [])]; updatedOthers[index] = { ...updatedOthers[index], count: Math.max(0, item.count - 1) }; const updated = { ...prev, others: updatedOthers }; autosaveExtraFields({ workers: updated }); return updated; }); }}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center active:bg-slate-200">−</button>
                  <span className="w-6 text-center font-bold text-slate-800 text-sm">{item.count}</span>
                  <button type="button" onClick={() => { setWorkers((prev) => { const updatedOthers = [...(prev.others || [])]; updatedOthers[index] = { ...updatedOthers[index], count: item.count + 1 }; const updated = { ...prev, others: updatedOthers }; autosaveExtraFields({ workers: updated }); return updated; }); }}
                    className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-bold flex items-center justify-center active:bg-blue-200">+</button>
                </div>
                <button type="button" onClick={() => { setWorkers((prev) => { const updated = { ...prev, others: (prev.others || []).filter((_, i) => i !== index) }; autosaveExtraFields({ workers: updated }); return updated; }); }}
                  className="w-8 h-8 rounded-xl border border-red-200 text-red-500 flex items-center justify-center active:bg-red-50 transition text-sm font-bold">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => { setWorkers((prev) => { const updated = { ...prev, others: [...(prev.others || []), { label: "", count: 0 }] }; autosaveExtraFields({ workers: updated }); return updated; }); }}
              className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-10">
              + {t.addOtherDepartment}
            </button>
          </div>
        </div>

        {/* ── WEATHER ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.weatherConditions}</span>
          <div className="space-y-3">
            {weather.map((w, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">From</label>
                    <input type="time" className={inputClass} value={w.from} onChange={(e) => { const updated = [...weather]; updated[index].from = e.target.value; setWeather(updated); autosaveExtraFields({ weather: updated }); }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">To</label>
                    <input type="time" className={inputClass} value={w.to} onChange={(e) => { const updated = [...weather]; updated[index].to = e.target.value; setWeather(updated); autosaveExtraFields({ weather: updated }); }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className={`${inputClass} flex-1`} value={w.condition} onChange={(e) => { const updated = [...weather]; updated[index].condition = e.target.value; setWeather(updated); autosaveExtraFields({ weather: updated }); }}>
                    <option value="">{t.selectWeather}</option>
                    {weatherOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.emoji} {opt.value}</option>)}
                  </select>
                  <button onClick={() => { const updated = weather.filter((_, i) => i !== index); setWeather(updated); autosaveExtraFields({ weather: updated }); }}
                    className="w-10 h-10 rounded-xl border border-red-200 text-red-500 flex items-center justify-center shrink-0 active:bg-red-50 transition text-sm">✕</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { const updated = [...weather, { from: "", to: "", condition: "" }]; setWeather(updated); autosaveExtraFields({ weather: updated }); }}
            className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-10">
            {t.addWeatherPeriod}
          </button>
        </div>

        {/* ── MATERIALS ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.materialsDelivered}</span>
          <div className="space-y-3">
            {materials.map((m, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder={t.material} className={`${inputClass} col-span-2`} value={m.name}
                    onChange={(e) => { const updated = [...materials]; updated[index].name = e.target.value; setMaterials(updated); autosaveExtraFields({ materials: updated }); }} />
                  <input type="number" placeholder={t.qty} className={inputClass} value={m.qty}
                    onChange={(e) => { const updated = [...materials]; updated[index].qty = e.target.value; setMaterials(updated); autosaveExtraFields({ materials: updated }); }} />
                  <select className={inputClass} value={m.unit} onChange={(e) => { const updated = [...materials]; updated[index].unit = e.target.value; setMaterials(updated); autosaveExtraFields({ materials: updated }); }}>
                    <option value="">{t.unit}</option>
                    {["bag","pcs","kg","ton","m2","m3","lot","roll"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder={t.remarkOptional} className={`${inputClass} flex-1`} value={m.note || ""}
                    onChange={(e) => { const updated = [...materials]; updated[index].note = e.target.value; setMaterials(updated); autosaveExtraFields({ materials: updated }); }} />
                  <button onClick={() => { const updated = materials.filter((_, i) => i !== index); setMaterials(updated); autosaveExtraFields({ materials: updated }); }}
                    className="w-10 h-10 rounded-xl border border-red-200 text-red-500 flex items-center justify-center shrink-0 active:bg-red-50 transition text-sm">✕</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { const updated = [...materials, { name: "", qty: "", unit: "", note: "" }]; setMaterials(updated); autosaveExtraFields({ materials: updated }); }}
            className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-10">
            {t.addMaterial}
          </button>
        </div>

        {/* ── EQUIPMENT ── */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
          <span className={sectionLabel}>{t.machineryEquipment}</span>
          <div className="space-y-3">
            {equipment.map((e, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder={t.equipmentName} className={`${inputClass} col-span-2`} value={e.name}
                    onChange={(ev) => { const updated = [...equipment]; updated[index].name = ev.target.value; setEquipment(updated); autosaveExtraFields({ equipment: updated }); }} />
                  <input type="number" placeholder={t.qty} className={inputClass} value={e.qty}
                    onChange={(ev) => { const updated = [...equipment]; updated[index].qty = ev.target.value; setEquipment(updated); autosaveExtraFields({ equipment: updated }); }} />
                  <div className="flex gap-2">
                    <input type="text" placeholder={t.remarkOptional} className={`${inputClass} flex-1`} value={e.note || ""}
                      onChange={(ev) => { const updated = [...equipment]; updated[index].note = ev.target.value; setEquipment(updated); autosaveExtraFields({ equipment: updated }); }} />
                    <button onClick={() => { const updated = equipment.filter((_, i) => i !== index); setEquipment(updated); autosaveExtraFields({ equipment: updated }); }}
                      className="w-10 h-10 rounded-xl border border-red-200 text-red-500 flex items-center justify-center shrink-0 active:bg-red-50 transition text-sm">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { const updated = [...equipment, { name: "", qty: "", status: "", note: "" }]; setEquipment(updated); autosaveExtraFields({ equipment: updated }); }}
            className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-10">
            {t.addEquipment}
          </button>
        </div>

        {/* ── SUBMIT / REGENERATE ── */}
        {reportStatus === "draft" && (
          <button onClick={submitReport} disabled={loading || !isOnline}
            className="w-full py-4 rounded-xl font-bold text-sm text-white min-h-12 active:scale-[0.98] transition bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-lg">
            {!isOnline ? "⚡ Offline — Cannot Submit"
              : loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.submitting}</span>
                : t.submitReport}
          </button>
        )}

        {reportStatus === "completed" && (
          <div className="space-y-3">
            {/* Info */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-700 font-medium">
                This report is completed. You can still edit content and regenerate the PDF.
              </p>
            </div>
            <button onClick={regeneratePdf} disabled={regenerating || !isOnline}
              className="w-full py-4 rounded-xl font-bold text-sm text-white min-h-12 active:scale-[0.98] transition bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg">
              {!isOnline ? "⚡ Offline — Cannot Regenerate"
                : regenerating
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.regeneratingPdf}</span>
                  : t.regeneratePdf}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}