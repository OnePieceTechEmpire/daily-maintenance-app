"use client";

import { useEffect, useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SparklesIcon } from '@heroicons/react/24/solid'; // or outline if you prefer

export default function NewReportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = params.projectId as string;
  const selectedDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const [reportId, setReportId] = useState<string | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
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
  // 1️⃣ Auto-create draft on first load
  // -----------------------------------------------
const initRef = useRef(false);

useEffect(() => {
  if (initRef.current) return;   // 🚀 prevents double-run even in Strict Mode
  initRef.current = true;

  async function init() {
    console.log("INIT RUNNING...");

    // Check existing report
    const { data: existing } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .eq("report_date", selectedDate)
      .maybeSingle();

    if (existing) {
      setReportId(existing.id);
      setSummary(existing.summary || "");
      loadImages(existing.id);
      return;
    }

    // Create new draft
    const { data: created, error } = await supabase
      .from("daily_reports")
      .insert([
        {
          project_id: projectId,
          report_date: selectedDate,
          status: "draft",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setReportId(created.id);
  }

  init();
}, []);


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




async function loadImages(reportId: string) {
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


  // -----------------------------------------------
  // Load existing images
  // -----------------------------------------------
  async function uploadImages(e: any) {
  if (!reportId) return;

  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  setUploading(true);

  // Upload sequentially OR parallel (we do sequential for stability)
for (const file of files as File[]) {
  await handleSingleUpload(file);
}

  setUploading(false);
}


async function handleSingleUpload(originalFile: File) {
  try {
    // 1️⃣ COMPRESS IMAGE
    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    };

    let file = originalFile;

    try {
      file = await imageCompression(originalFile, options);
    } catch (err) {
      console.warn("Compression failed, using original file.");
    }

    // 2️⃣ UPLOAD TO SUPABASE
    const filePath = `${reportId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("report-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      return alert("Upload failed");
    }

    const url = `https://wnvkfycjjuxjezxggcpg.supabase.co/storage/v1/object/public/report-images/${filePath}`;

    // 3️⃣ INSERT DB ROW
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

    // 4️⃣ UPDATE UI
    setImages((prev) => [...prev, imageRow]);
  } catch (err) {
    console.error("Upload failed:", err);
  }
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

  // -----------------------------------------------
  // Save Summary
  // -----------------------------------------------
  async function saveSummary(text: string) {
    setSummary(text);
    if (!reportId) return;

    await supabase
      .from("daily_reports")
      .update({ summary: text, status: "draft" })
      .eq("id", reportId);
  }


  // -----------------------------------------------
  // Save Details
  // -----------------------------------------------
  async function autosaveExtraFields(updated?: Partial<any>) {
  if (!reportId) return;

  await supabase
    .from("daily_reports")
    .update({
      workers,
      weather,
      materials,
      equipment,
      status: "draft",
      ...updated, // optional override
    })
    .eq("id", reportId);
}


  // -----------------------------------------------
  // Submit Report
  // -----------------------------------------------
  async function submitReport() {
    if (!reportId) return;

    setLoading(true);

    await supabase
      .from("daily_reports")
      .update({ status: "completed" })
      .eq("id", reportId);

      // 🔥 Generate PDF
// 2️⃣ Trigger PDF generation
await fetch("/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reportId }),
});


    router.push(`/projects/${projectId}/dashboard`);
  }


  

  // -----------------------------------------------
  // UI
  // -----------------------------------------------

  if (!reportId) {
    return <div className="p-6">Preparing draft report...</div>;
  }

return (
  <div className="min-h-screen bg-gray-100">

    {/* HEADER */}
{/* HEADER */}
<div className="bg-blue-700 text-white shadow-lg">

  {/* SAFE AREA TOP */}
  <div className="h-[env(safe-area-inset-top)]" />

  <div className="p-6 rounded-b-3xl">
    <div className="max-w-4xl mx-auto flex items-center gap-4">

      {/* Back Button */}
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
        <h1 className="text-3xl font-bold">Daily Report</h1>
        <p className="text-white/80 text-sm mt-1">
          {selectedDate}
        </p>
      </div>

    </div>
  </div>
</div>

    

    <div className="max-w-4xl mx-auto p-5 space-y-6">

      {/* UPLOAD IMAGE */}
      <div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
        <label className="block font-semibold text-gray-700 mb-2">
          Upload Images
        </label>

        <label className="
            flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl
            cursor-pointer bg-gray-50 hover:bg-gray-100 transition
          ">
          <span className="text-gray-600 text-sm">Tap to upload image</span>
    {/* Hidden file input */}
    <input
      type="file"
      multiple
      onChange={uploadImages}
      className="hidden"
    />



        </label>

          {/* 🔥 Upload indicator shows HERE */}
  {uploading && (
    <div className="flex items-center gap-2 text-gray-600 text-sm mt-2">
      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      Uploading images...
    </div>
  )}
      </div>

      {/* IMAGE GRID */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden relative"
            >
              {/* DELETE BUTTON */}
              <button
                className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded shadow active:scale-90"
                onClick={() => deleteImage(img)}
              >
                X
              </button>

              <img
                src={img.image_url}
                className="w-full h-32 object-cover"
              />

              {/* CAPTION INPUT */}
              <div className="p-3 border-t bg-gray-50">
<input
  type="text"
  className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
  placeholder="Add caption..."
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
          ))}
        </div>
      )}

      {/* SUMMARY CARD */}
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
    placeholder="Write a summary of today's work..."
  />

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



    {cleaning && (
      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
    )}
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
      <div>
        <button
          onClick={submitReport}
          disabled={loading}
          className="
            w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-lg font-semibold 
            shadow active:scale-95 transition
          "
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </div>

    </div>

  </div>
  
);

}
