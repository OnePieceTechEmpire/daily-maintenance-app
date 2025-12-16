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
<div
  className="
    bg-gradient-to-r from-blue-600 to-blue-800
    pt-[env(safe-area-inset-top)]
    p-6
    text-white
    rounded-b-3xl
    shadow-lg
  "
>


      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Daily Report</h1>
<p className="text-white text-sm mt-1 opacity-90">
  {selectedDate}
</p>

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
<button
  onClick={cleanSummary}
  className="
    relative inline-flex items-center justify-center
    bg-gradient-to-r from-blue-500 to-blue-600
    text-white font-semibold text-sm py-2 px-6
    rounded-2xl shadow-md
    hover:from-blue-600 hover:to-blue-700
    transition-all duration-300 ease-in-out
    active:scale-95
  "
  disabled={cleaning}
>
  {cleaning ? (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Improving...
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <SparklesIcon className="w-5 h-5 text-white animate-pulse" />
      Clean Summary with AI
    </div>
  )}
</button>


    {cleaning && (
      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
    )}
  </div>
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
