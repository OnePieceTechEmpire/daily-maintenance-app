"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";
import { SparklesIcon } from '@heroicons/react/24/solid'; // or outline if you prefer

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
      .select("*")
      .eq("id", reportId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setSummary(data.summary || "");
    setReportDate(data.report_date);
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
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white rounded-b-3xl shadow-lg">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Edit Report</h1>
        <p className="text-blue-100 text-sm mt-1">{reportDate}</p>
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
          <button
            onClick={cleanSummary}
            disabled={cleaning}
            className="
              relative inline-flex items-center justify-center
              bg-gradient-to-r from-blue-500 to-blue-600
              text-white font-semibold text-sm py-2 px-6
              rounded-2xl shadow-md
              hover:from-blue-600 hover:to-blue-700
              transition-all duration-300 ease-in-out
              active:scale-95
            "
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
        </div>
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
