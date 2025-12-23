"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { SparklesIcon } from '@heroicons/react/24/solid'; // or outline if you prefer

type WorkersState = {
  partition: number;
  ceiling: number;
  mne: number;
  flooring: number;
  brickwork: number;
  carpenter: number;
  painter: number;
  others: { label: string; count: number }[];
};

export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;

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

  const files = Array.from(e.target.files) as File[];
  if (files.length === 0) return;

  setUploading(true);

  for (const file of files) {
    await handleSingleUpload(file);
  }

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
  // -----------------------------------------------
  // Submit Report
  // -----------------------------------------------
  async function submitReport() {
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

return (
  <div className="min-h-screen bg-gray-100">

{/* HEADER */}
<div className="bg-blue-700 text-white shadow-lg">

  {/* SAFE AREA TOP (THIS IS THE KEY) */}
  <div className="h-[env(safe-area-inset-top)]" />

  <div className="p-6 rounded-b-3xl">


      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Edit Report</h1>
        <p className="text-white text-sm mt-1 opacity-90">{reportDate}</p>
      </div>
    </div>
</div>
    {/* CONTENT */}
    <div className="max-w-4xl mx-auto p-5 space-y-6">

      {/* UPLOAD IMAGE */}
      <div className="bg-white border border-gray-200 shadow-sm p-5 rounded-2xl">
        <label className="block font-semibold text-gray-700 mb-2">
          Upload Images
        </label>

        <label
          className="
            flex flex-col items-center justify-center p-6 
            border-2 border-dashed border-gray-300 rounded-xl
            cursor-pointer bg-gray-50 hover:bg-gray-100 transition
          "
        >
          <span className="text-gray-600 text-sm">Tap to upload images</span>

          {/* Hidden input */}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={uploadImages}
          />
        </label>

        {/* Upload indicator */}
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
    onClick={cleanSummary}
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
            w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl 
            text-lg font-semibold shadow active:scale-95 transition
          "
        >
          {loading ? "Submitting.." : "Submit Report"}
        </button>
      </div>
    </div>
  </div>
);

}
