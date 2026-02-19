"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { SparklesIcon } from '@heroicons/react/24/solid'; // or outline if you prefer
import { CameraIcon, PhotoIcon } from "@heroicons/react/24/solid";
import {
  TrashIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/solid";



type WorkersState = {
  partition: number;
  ceiling: number;
  mne: number;
  flooring: number;
  brickwork: number;
  carpenter: number;
  painter: number;
  plumber: number;
  others: { label: string; count: number }[];
};

export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;


  const [reportStatus, setReportStatus] = useState<"draft" | "completed">("draft");
  const [regenerating, setRegenerating] = useState(false);
  const [rotating, setRotating] = useState<Record<string, boolean>>({});


  const [images, setImages] = useState<any[]>([]);
  const [summary, setSummary] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});
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


  // -----------------------------------------------
  // Load Report + Images
  // -----------------------------------------------
  useEffect(() => {
    loadReport();
    loadImages();
  }, []);

async function loadReport() {
  const { data, error } = await supabase
    .from("daily_reports")
    .select(`
      summary,
      report_date,
          status,
      weather,
      workers,
      materials,
      equipment
    `)
    .eq("id", reportId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  setReportStatus((data.status as any) || "draft");

  setSummary(data.summary || "");
  setReportDate(data.report_date);

  // 🔥 THIS IS THE FIX
  setWeather(Array.isArray(data.weather) ? data.weather : []);
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
        plumber: data.workers.plumber?? 0,
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
  setMaterials(Array.isArray(data.materials) ? data.materials : []);
  setEquipment(Array.isArray(data.equipment) ? data.equipment : []);
}

  async function loadImages() {
    const { data } = await supabase
      .from("report_images")
      .select("*")
      .eq("report_id", reportId);

    setImages(data || []);
  }

  useEffect(() => {
  const drafts: Record<string, string> = {};
  images.forEach((img) => {
    drafts[img.id] = img.caption || "";
  });
  setCaptionDrafts(drafts);
}, [images]);




async function uploadImages(e: any) {
  if (!reportId) return;

  const files = Array.from(e.target.files || []) as File[];
  e.target.value = ""; // ✅ important for Android

  if (files.length === 0) return;

  setUploading(true);
  for (const file of files) await handleSingleUpload(file);
  setUploading(false);
}

  

  // -----------------------------------------------
  // Upload Image
  // -----------------------------------------------
async function handleSingleUpload(originalFile: File) {
  try {
    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    };

    let file = originalFile;

    try {
      file = await imageCompression(originalFile, options);
    } catch {
      console.warn("Compression failed — using original file.");
    }

    const filePath = `${reportId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("report-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      return alert("Upload failed");
    }

    const url = `https://wnvkfycjjuxjezxggcpg.supabase.co/storage/v1/object/public/report-images/${filePath}`;

    const { data: imageRow } = await supabase
      .from("report_images")
      .insert([
        {
          report_id: reportId,
          image_url: url,
          caption: "",
        },
      ])
      .select()
      .single();

    setImages((prev) => [...prev, imageRow]);
  } catch (err) {
    console.error("Upload failed:", err);
  }
}


async function rotateImageUrlToJpegBlob(
  imageUrl: string,
  direction: "left" | "right"
) {
  const res = await fetch(imageUrl);
  const blob = await res.blob();

  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // 90-degree rotation swaps dimensions
  canvas.width = img.height;
  canvas.height = img.width;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((direction === "right" ? 90 : -90) * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const outBlob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9)
  );

  return outBlob;
}

function getStoragePathFromPublicUrl(url: string) {
  const prefix = "public/report-images/";
  const index = url.indexOf(prefix);
  if (index === -1) return null;
  return url.substring(index + prefix.length);
}


async function rotateAndReplaceImage(img: any, direction: "left" | "right") {
  if (!reportId) return;

  setRotating((p) => ({ ...p, [img.id]: true }));

  try {
    // 1) rotate existing image into new jpeg blob
    const rotatedBlob = await rotateImageUrlToJpegBlob(img.image_url, direction);

    // 2) upload rotated file
    const newPath = `${reportId}/${Date.now()}-rotated.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("report-images")
      .upload(newPath, rotatedBlob, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "0",
      });

    if (uploadError) {
      console.error(uploadError);
      alert("Rotate upload failed");
      return;
    }

    const newUrl = `https://wnvkfycjjuxjezxggcpg.supabase.co/storage/v1/object/public/report-images/${newPath}`;

    // 3) update DB row
    const { error: dbError } = await supabase
      .from("report_images")
      .update({ image_url: newUrl })
      .eq("id", img.id);

    if (dbError) {
      console.error(dbError);
      alert("Failed to update image URL in database");
      return;
    }

    // 4) update UI immediately
    setImages((prev) =>
      prev.map((x) => (x.id === img.id ? { ...x, image_url: newUrl } : x))
    );

    // 5) delete old file from storage (optional but good)
    const oldPath = getStoragePathFromPublicUrl(img.image_url);
    if (oldPath) {
      const { error: removeError } = await supabase.storage
        .from("report-images")
        .remove([oldPath]);

      if (removeError) {
        // not fatal, just log
        console.warn("Old image delete failed:", removeError);
      }
    }
  } catch (e) {
    console.error(e);
    alert("Rotate failed");
  } finally {
    setRotating((p) => ({ ...p, [img.id]: false }));
  }
}






  // -----------------------------------------------
  // Update caption
  // -----------------------------------------------
  async function updateCaption(id: string, caption: string) {
    await supabase
      .from("report_images")
      .update({ caption })
      .eq("id", id);

    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, caption } : img))
    );
  }

  async function cleanSummaryAndCaptions() {
  // if summary empty AND no captions -> do nothing
  const hasSummary = summary.trim().length > 0;
  const captionIds = Object.keys(captionDrafts);
  const nonEmptyCaptionIds = captionIds.filter(
    (id) => (captionDrafts[id] || "").trim().length > 0
  );

  if (!hasSummary && nonEmptyCaptionIds.length === 0) {
    return alert("Nothing to clean yet.");
  }

  setCleaning(true);

  try {
    // 1) Clean summary (if exists)
    if (hasSummary) {
      const res = await fetch("/api/clean-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "summary", text: summary }),
      });

      const data = await res.json();
      const cleanedSummary = data.cleaned || summary;

      setSummary(cleanedSummary);
      await saveSummary(cleanedSummary);
    }

    // 2) Clean captions (only non-empty)
    for (const imageId of nonEmptyCaptionIds) {
      const original = captionDrafts[imageId];

      const res = await fetch("/api/clean-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "caption", text: original }),
      });

      const data = await res.json();
      const cleanedCaption = data.cleaned || original;

      // update UI
      setCaptionDrafts((prev) => ({
        ...prev,
        [imageId]: cleanedCaption,
      }));

      // save to DB (use your existing function)
      await updateCaption(imageId, cleanedCaption);
    }

    alert("Summary + captions cleaned ✅");
  } finally {
    setCleaning(false);
  }
}


  // -----------------------------------------------
  // Save Summary
  // -----------------------------------------------
  async function saveSummary(text: string) {
    setSummary(text);

    await supabase
      .from("daily_reports")
      .update({ summary: text })
      .eq("id", reportId);
  }

  
  // -----------------------------------------------
  // Save Details
  // -----------------------------------------------
  async function autosaveExtraFields(updated?: Partial<any>) {
  if (!reportId) return;

await supabase.from("daily_reports").update({
  workers,
  weather,
  materials,
  equipment,
  ...(reportStatus === "draft" ? { status: "draft" } : {}), // only force draft if draft
  ...updated,
}).eq("id", reportId);

}

  async function saveCaption(imageId: string) {
  const caption = captionDrafts[imageId] || "";

  await supabase
    .from("report_images")
    .update({ caption })
    .eq("id", imageId);

  // Optional: sync images state (safe)
  setImages((prev) =>
    prev.map((img) =>
      img.id === imageId ? { ...img, caption } : img
    )
  );
}



      // -----------------------------------------------
  // DELETE IMAGE
  // -----------------------------------------------
async function deleteImage(img: any) {
  const confirmDelete = confirm("Delete this image?");
  if (!confirmDelete) return;

  // --- 1) Extract correct storage path from URL ---
  // Example URL:
  // https://.../storage/v1/object/public/report-images/REPORTID/FILE
  const url = img.image_url;

  // Extract everything AFTER "public/report-images/"
  const prefix = "public/report-images/";
  const index = url.indexOf(prefix);

  if (index === -1) {
    console.error("Could not parse storage path from URL");
    return;
  }

  const path = url.substring(index + prefix.length);

  console.log("Deleting file path:", path);

  // --- 2) Delete from storage ---
  const { error: storageError } = await supabase
    .storage
    .from("report-images")
    .remove([path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    alert("Failed to delete image file.");
    return;
  }

  // --- 3) Delete row from DB ---
  const { error: dbError } = await supabase
    .from("report_images")
    .delete()
    .eq("id", img.id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    alert("Failed to delete database row.");
    return;
  }

  // --- 4) Update UI immediately ---
  setImages((prev) => prev.filter((i) => i.id !== img.id));

  console.log("Image deleted successfully");
}

async function cleanSummary() {
  if (!summary.trim()) return alert("Summary is empty.");
  setCleaning(true);

  const res = await fetch("/api/clean-summary", {
    method: "POST",
    body: JSON.stringify({ text: summary }),
  });

  const data = await res.json();
  setSummary(data.cleaned);
  saveSummary(data.cleaned);

  setCleaning(false);
}

async function regeneratePdf() {
  setRegenerating(true);

  // make sure latest summary is saved before generating
  await supabase.from("daily_reports").update({
    summary,
    workers,
    weather,
    materials,
    equipment,
          status: "completed", // lock status just in case
  }).eq("id", reportId);

  const res = await fetch("/api/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });

  if (!res.ok) {
    setRegenerating(false);
    return alert("Failed to regenerate PDF");
  }

  const data = await res.json();

  // OPTIONAL: refresh local status/anything
  // You can also update reportStatus to completed to be safe
  setReportStatus("completed");

  
  setRegenerating(false);
  alert("PDF regenerated ");
    // 4️⃣ Go back to View page
  router.push(`/projects/${projectId}/dashboard`);
}

  // -----------------------------------------------
  // Submit Report
  // -----------------------------------------------
async function submitReport() {
  setLoading(true);

  // ensure everything is saved before completing
  await supabase.from("daily_reports").update({
    summary,
    workers,
    weather,
    materials,
    equipment,
    status: "completed",
  }).eq("id", reportId);

  const res = await fetch("/api/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });

  if (!res.ok) {
    setLoading(false);
    alert("Report completed, but PDF generation failed. You can regenerate PDF later.");
    router.push(`/projects/${projectId}/dashboard`);
    return;
  }

  setLoading(false);
  router.push(`/projects/${projectId}/dashboard`);
}


  // -----------------------------------------------
  // UI
  // -----------------------------------------------

return (
  <div className="min-h-screen bg-gray-100">

{/* HEADER */}
<div className="bg-blue-900 text-white shadow-lg">

  {/* SAFE AREA TOP (THIS IS THE KEY) */}
  <div className="h-[env(safe-area-inset-top)]" />

  <div className="p-6 rounded-b-3xl">


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

  {/* Title + Date */}
  <div className="flex flex-col">
    <h1 className="text-3xl font-bold">Edit Report</h1>
    <p className="text-white/80 text-sm mt-1">
      {reportDate}
    </p>
  </div>
</div>

    </div>
</div>
    {/* CONTENT */}
    <div className="max-w-4xl mx-auto p-5 space-y-6">

      {/* UPLOAD IMAGE */}
{/* UPLOAD IMAGES (Mobile-friendly) */}
<div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
  <div className="flex items-start justify-between gap-3">
    <div>
      <label className="block font-semibold text-gray-800">
        Upload Photos
      </label>

    </div>

    {/* Small status pill */}
    {uploading ? (
      <span className="shrink-0 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
        <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Uploading
      </span>
    ) : (
      <span className="shrink-0 text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
        Ready
      </span>
    )}
  </div>

  <div className="mt-4 grid grid-cols-2 gap-3">
    {/* CAMERA */}
    <label
      className="
        group relative overflow-hidden cursor-pointer
        rounded-2xl p-4 border border-blue-200
        bg-gradient-to-br from-blue-600 to-indigo-600
        text-white shadow-sm active:scale-[0.98] transition
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
          <CameraIcon className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="text-sm font-bold leading-tight">Camera</div>
          <div className="text-[10px] opacity-90 mt-0.5">
            Take a new photo
          </div>
        </div>
      </div>

      {/* subtle shine */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 bg-white/15 rounded-full blur-2xl group-hover:bg-white/20 transition" />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={uploadImages}
        className="hidden"
      />
    </label>

    {/* GALLERY */}
    <label
      className="
        group cursor-pointer rounded-2xl p-4
        border border-gray-200 bg-gray-50
        hover:bg-gray-100 shadow-sm
        active:scale-[0.98] transition
      "
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
          <PhotoIcon className="w-6 h-6 text-gray-700" />
        </div>

        <div className="flex-1">
          <div className="text-sm font-bold text-gray-800 leading-tight">
            Gallery
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Choose multiple
          </div>
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={uploadImages}
        className="hidden"
      />
    </label>
  </div>

  {/* Optional hint line */}
  <p className="mt-3 text-[11px] text-gray-500">
    Tip: If camera doesn’t appear, allow camera permission in your phone settings.
  </p>
</div>



   {/* IMAGE GRID (2-cols mobile, full portrait visible) */}
{images.length > 0 && (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {images.map((img) => {
      const isRotating = !!rotating?.[img.id];

      return (
        <div
          key={img.id}
          className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden"
        >
          {/* IMAGE BOX */}
          <div className="relative bg-gray-100">
            {/* Taller than before, still compact */}
            <img
              src={img.image_url}
              alt="Report"
              className="
                w-full h-44 sm:h-48 md:h-40
                object-contain
              "
            />

            {/* TOP-RIGHT: Delete */}
            <button
              type="button"
              onClick={() => deleteImage(img)}
              className="
                absolute top-2 right-2
                w-9 h-9 rounded-xl
                bg-red-600 text-white shadow
                flex items-center justify-center
                hover:bg-red-700 active:scale-95 transition
              "
              aria-label="Delete image"
            >
              <TrashIcon className="w-5 h-5" />
            </button>

            {/* BOTTOM: Rotate Bar */}
{/* BOTTOM: Rotate Bar */}
<div className="absolute inset-x-0 bottom-1 px-1.5">
  <div
    className="
      flex gap-1.5
      bg-black/55 backdrop-blur
      rounded-lg p-1
    "
  >
    <button
      type="button"
      disabled={isRotating}
      onClick={() => rotateAndReplaceImage(img, "left")}
      className="
        flex-1 inline-flex items-center justify-center gap-1
        text-white text-[11px] font-medium
        py-1.5 rounded-md
        hover:bg-white/10 active:scale-[0.98] transition
        disabled:opacity-60
      "
    >
      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
      {isRotating ? "..." : "Left"}
    </button>

    <button
      type="button"
      disabled={isRotating}
      onClick={() => rotateAndReplaceImage(img, "right")}
      className="
        flex-1 inline-flex items-center justify-center gap-1
        text-white text-[11px] font-medium
        py-1.5 rounded-md
        hover:bg-white/10 active:scale-[0.98] transition
        disabled:opacity-60
      "
    >
      <ArrowUturnRightIcon className="w-3.5 h-3.5" />
      {isRotating ? "..." : "Right"}
    </button>
  </div>
</div>

          </div>

          {/* CAPTION */}
          <div className="p-3 bg-gray-50 border-t">
            <input
              type="text"
              className="
                w-full px-3 py-2 rounded-xl
                border border-gray-200 bg-white
                focus:ring-2 focus:ring-blue-400 focus:outline-none
                text-sm
              "
              placeholder="Add caption…"
              value={captionDrafts[img.id] || ""}
              onChange={(e) =>
                setCaptionDrafts((prev) => ({
                  ...prev,
                  [img.id]: e.target.value,
                }))
              }
              onBlur={() => saveCaption(img.id)}
            />
          </div>
        </div>
      );
    })}
  </div>
)}


      {/* SUMMARY CARD */}
      <div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
        <label className="block font-semibold text-gray-700 mb-2">
          Summary
        </label>

        <textarea
          className="
            w-full h-36 px-4 py-3 border border-gray-300 rounded-xl
            focus:ring-2 focus:ring-blue-400 outline-none resize-none
          "
          value={summary}
          onChange={(e) => saveSummary(e.target.value)}
          placeholder="Update your summary..."
        />

        {/* BUTTON ROW */}
        <div className="mt-4 flex items-center gap-3">
<div className="mt-4">
  <button
    onClick={cleanSummaryAndCaptions}
    disabled={cleaning}
    className="
      w-full
      flex items-center justify-center gap-2
      bg-blue-600
      text-white font-semibold text-sm
      py-3 px-4
      rounded-xl
      shadow
      hover:bg-blue-700
      active:scale-95
      transition
      disabled:opacity-60
      disabled:cursor-not-allowed
    "
  >
    {cleaning ? (
      <>
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        Improving summary…
      </>
    ) : (
      <>
        <SparklesIcon className="w-5 h-5" />
        Clean Summary with AI
      </>
    )}
  </button>
</div>

        </div>
      </div>


      {/* WORKERS SECTION */}
<div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
  <h3 className="font-semibold text-gray-800 mb-4">Workers on Site</h3>

  <div className="space-y-3">
    {[
      ["partition", "Partition"],
      ["ceiling", "Ceiling"],
      ["mne", "M&E"],
      ["flooring", "Flooring"],
      ["brickwork", "Brick Work"],
      ["carpenter", "Carpenter"],
      ["painter", "Painter"],
      ["plumber", "Plumber"],
    ].map(([key, label]) => (
      <div key={key} className="flex justify-between items-center">
        <span className="text-sm text-gray-700">{label}</span>
        <input
          type="number"
          min={0}
          className="w-20 px-2 py-1 border rounded text-center"
          value={(workers as any)[key]}
          onChange={(e) => {
            const value = Number(e.target.value);
            setWorkers((prev) => {
              const updated = { ...prev, [key]: value };
              autosaveExtraFields({ workers: updated });
              return updated;
            });
          }}
        />
      </div>
    ))}
  </div>

  {/* OTHERS */}
  <div className="mt-5">
    <h4 className="text-sm font-semibold text-gray-700 mb-2">Others</h4>

    {workers.others.map((item, index) => (
      <div key={index} className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Department"
          className="flex-1 px-2 py-1 border rounded"
          value={item.label}
          onChange={(e) => {
            const updated = [...workers.others];
            updated[index].label = e.target.value;
            const newWorkers = { ...workers, others: updated };
            setWorkers(newWorkers);
            autosaveExtraFields({ workers: newWorkers });
          }}
        />

        <input
          type="number"
          min={0}
          className="w-20 px-2 py-1 border rounded text-center"
          value={item.count}
          onChange={(e) => {
            const updated = [...workers.others];
            updated[index].count = Number(e.target.value);
            const newWorkers = { ...workers, others: updated };
            setWorkers(newWorkers);
            autosaveExtraFields({ workers: newWorkers });
          }}
        />

        <button
          className="text-red-500 text-sm"
          onClick={() => {
            const updated = workers.others.filter((_, i) => i !== index);
            const newWorkers = { ...workers, others: updated };
            setWorkers(newWorkers);
            autosaveExtraFields({ workers: newWorkers });
          }}
        >
          ✕
        </button>
      </div>
    ))}

    <button
      className="mt-2 text-sm text-blue-600 font-semibold"
      onClick={() => {
        const newWorkers = {
          ...workers,
          others: [...workers.others, { label: "", count: 0 }],
        };
        setWorkers(newWorkers);
        autosaveExtraFields({ workers: newWorkers });
      }}
    >
      + Add Other Department
    </button>
  </div>
</div>

{/* WEATHER SECTION */}
<div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
  <h3 className="font-semibold text-gray-800 mb-4">Weather Conditions</h3>

  {weather.map((w, index) => (
    <div key={index} className="flex flex-col sm:flex-row gap-2 mb-3">

      {/* FROM */}
      <input
        type="time"
        className="px-3 py-2 border rounded w-full sm:w-32"
        value={w.from}
        onChange={(e) => {
          const updated = [...weather];
          updated[index].from = e.target.value;
          setWeather(updated);
          autosaveExtraFields({ weather: updated });
        }}
      />

      {/* TO */}
      <input
        type="time"
        className="px-3 py-2 border rounded w-full sm:w-32"
        value={w.to}
        onChange={(e) => {
          const updated = [...weather];
          updated[index].to = e.target.value;
          setWeather(updated);
          autosaveExtraFields({ weather: updated });
        }}
      />

      {/* CONDITION */}
      <select
        className="px-3 py-2 border rounded w-full sm:flex-1"
        value={w.condition}
        onChange={(e) => {
          const updated = [...weather];
          updated[index].condition = e.target.value;
          setWeather(updated);
          autosaveExtraFields({ weather: updated });
        }}
      >
        <option value="">Select weather</option>
        <option value="Sunny">Sunny</option>
        <option value="Cloudy">Cloudy</option>
        <option value="Rain">Rain</option>
        <option value="Heavy Rain">Heavy Rain</option>
        <option value="Thunderstorm">Thunderstorm</option>
      </select>

      {/* DELETE */}
      <button
        className="text-red-500 text-sm px-2"
        onClick={() => {
          const updated = weather.filter((_, i) => i !== index);
          setWeather(updated);
          autosaveExtraFields({ weather: updated });
        }}
      >
        ✕
      </button>
    </div>
  ))}

  {/* ADD WEATHER */}
  <button
    className="mt-2 text-sm text-blue-600 font-semibold"
    onClick={() => {
      const updated = [
        ...weather,
        { from: "", to: "", condition: "" },
      ];
      setWeather(updated);
      autosaveExtraFields({ weather: updated });
    }}
  >
    + Add Weather Period
  </button>
</div>

{/* MATERIALS DELIVERED */}
<div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
  <h3 className="font-semibold text-gray-800 mb-4">
    Materials Delivered
  </h3>

  {materials.map((m, index) => (
    <div
      key={index}
      className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-3"
    >

      {/* MATERIAL NAME */}
      <input
        type="text"
        placeholder="Material"
        className="px-3 py-2 border rounded sm:col-span-2"
        value={m.name}
        onChange={(e) => {
          const updated = [...materials];
          updated[index].name = e.target.value;
          setMaterials(updated);
          autosaveExtraFields({ materials: updated });
        }}
      />

      {/* QUANTITY */}
      <input
        type="number"
        placeholder="Qty"
        className="px-3 py-2 border rounded"
        value={m.qty}
        onChange={(e) => {
          const updated = [...materials];
          updated[index].qty = e.target.value;
          setMaterials(updated);
          autosaveExtraFields({ materials: updated });
        }}
      />

      {/* UNIT */}
      <select
        className="px-3 py-2 border rounded"
        value={m.unit}
        onChange={(e) => {
          const updated = [...materials];
          updated[index].unit = e.target.value;
          setMaterials(updated);
          autosaveExtraFields({ materials: updated });
        }}
      >
        <option value="">Unit</option>
        <option value="bag">Bag</option>
        <option value="pcs">Pcs</option>
        <option value="kg">Kg</option>
        <option value="ton">Ton</option>
        <option value="m2">m²</option>
        <option value="m3">m³</option>
      </select>

      
      {/* NOTE */}
      <input
        type="text"
        placeholder="Remark (optional)"
        className="px-3 py-2 border rounded sm:col-span-5"
        value={m.note || ""}
        onChange={(e) => {
          const updated = [...materials];
          updated[index].note = e.target.value;
          setMaterials(updated);
          autosaveExtraFields({ materials: updated });
        }}
      />

      {/* DELETE */}
      <button
        className="text-red-500 text-sm px-2"
        onClick={() => {
          const updated = materials.filter((_, i) => i !== index);
          setMaterials(updated);
          autosaveExtraFields({ materials: updated });
        }}
      >
        ✕
      </button>

    </div>
  ))}

  {/* ADD MATERIAL */}
  <button
    className="mt-2 text-sm text-blue-600 font-semibold"
    onClick={() => {
      const updated = [
        ...materials,
        { name: "", qty: "", unit: "" },
      ];
      setMaterials(updated);
      autosaveExtraFields({ materials: updated });
    }}
  >
    + Add Material
  </button>
</div>

{/* MACHINERY / EQUIPMENT */}
<div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
  <h3 className="font-semibold text-gray-800 mb-4">
    Machinery / Equipment
  </h3>

  {equipment.map((e, index) => (
    <div
      key={index}
      className="grid grid-cols-1 sm:grid-cols-6 gap-2 mb-3"
    >

      {/* EQUIPMENT NAME */}
      <input
        type="text"
        placeholder="Equipment"
        className="px-3 py-2 border rounded sm:col-span-2"
        value={e.name}
        onChange={(ev) => {
          const updated = [...equipment];
          updated[index].name = ev.target.value;
          setEquipment(updated);
          autosaveExtraFields({ equipment: updated });
        }}
      />

      {/* QUANTITY */}
      <input
        type="number"
        placeholder="Qty"
        className="px-3 py-2 border rounded"
        value={e.qty}
        onChange={(ev) => {
          const updated = [...equipment];
          updated[index].qty = ev.target.value;
          setEquipment(updated);
          autosaveExtraFields({ equipment: updated });
        }}
      />

      {/* STATUS 
      <select
        className="px-3 py-2 border rounded"
        value={e.status}
        onChange={(ev) => {
          const updated = [...equipment];
          updated[index].status = ev.target.value;
          setEquipment(updated);
          autosaveExtraFields({ equipment: updated });
        }}
      >
        <option value="">Status</option>
        <option value="in-use">In Use</option>
        <option value="idle">Idle</option>
        <option value="breakdown">Breakdown</option>
      </select>*/}

            {/* NOTE */}
      <input
        type="text"
        placeholder="Remark (optional)"
        className="px-3 py-2 border rounded sm:col-span-6"
        value={e.note || ""}
        onChange={(ev) => {
          const updated = [...equipment];
          updated[index].note = ev.target.value;
          setEquipment(updated);
          autosaveExtraFields({ equipment: updated });
        }}
      />

      {/* DELETE */}
      <button
        className="text-red-500 text-sm px-2"
        onClick={() => {
          const updated = equipment.filter((_, i) => i !== index);
          setEquipment(updated);
          autosaveExtraFields({ equipment: updated });
        }}
      >
        ✕
      </button>


    </div>
  ))}

  {/* ADD EQUIPMENT */}
  <button
    className="mt-2 text-sm text-blue-600 font-semibold"
    onClick={() => {
      const updated = [
        ...equipment,
        { name: "", qty: "", status: "" },
      ];
      setEquipment(updated);
      autosaveExtraFields({ equipment: updated });
    }}
  >
    + Add Equipment
  </button>
</div>



      {/* SUBMIT BUTTON */}
      {reportStatus === "draft" && (
      <div>
        <button
          onClick={submitReport}
          disabled={loading}
          className="
            w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl 
            text-lg font-semibold shadow active:scale-95 transition
          "
        >
          {loading ? "Submitting.." : "Submit Report"}
        </button>
      </div>
      )}

      {reportStatus === "completed" && (
  <button
    onClick={regeneratePdf}
    disabled={regenerating}
    className="
      w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl 
      text-lg font-semibold shadow active:scale-95 transition
      disabled:opacity-60 disabled:cursor-not-allowed
    "
  >
    {regenerating ? "Regenerating PDF..." : "Regenerate PDF"}
  </button>
)}

    </div>
  </div>
);

}
