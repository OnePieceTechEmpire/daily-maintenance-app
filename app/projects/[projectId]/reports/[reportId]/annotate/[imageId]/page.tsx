"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; width: number };

export default function AnnotateImagePage() {
  const router = useRouter();
  const params = useParams();

  const projectId = params.projectId as string;
  const reportId = params.reportId as string;
  const imageId = params.imageId as string;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  const [penWidth, setPenWidth] = useState(6);
  const [saving, setSaving] = useState(false);

  // Load image row
useEffect(() => {
  let objectUrl: string | null = null;

  (async () => {
    const { data, error } = await supabase
      .from("report_images")
      .select("image_url")
      .eq("id", imageId)
      .single();

    if (error || !data) {
      router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
      return;
    }

    try {
      const publicUrl = data.image_url;

      // Extract path from your public URL
      const marker = "/storage/v1/object/public/report-images/";
      const idx = publicUrl.indexOf(marker);

      if (idx === -1) throw new Error("Bad image_url format");

      const path = publicUrl.substring(idx + marker.length);

      // ✅ Signed URL (works even if bucket public)
      const { data: signed, error: signErr } = await supabase.storage
        .from("report-images")
        .createSignedUrl(path, 60 * 10); // 10 mins

      if (signErr || !signed?.signedUrl) throw signErr;

      // ✅ Fetch as blob -> convert to local object URL (prevents taint)
      const resp = await fetch(signed.signedUrl);
      const blob = await resp.blob();
      objectUrl = URL.createObjectURL(blob);

      setImageUrl(objectUrl);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert("Failed to load image for annotation.");
      router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
    }
  })();

  return () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}, [imageId, projectId, reportId, router]);

  // Resize canvas to match displayed image size
  function syncCanvasSize() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    // Set canvas CSS size to match image box
    const rect = img.getBoundingClientRect();
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Set canvas internal resolution (devicePixelRatio for crisp lines)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redraw();
  }

  useEffect(() => {
    if (!imageUrl) return;

    const onResize = () => syncCanvasSize();
    window.addEventListener("resize", onResize);

    // After image loads, sync
    const img = imgRef.current;
    if (img) {
      img.onload = () => syncCanvasSize();
    }

    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, strokes]);

  // Convert pointer pos to canvas coordinates
  function getPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function redraw(nextStrokes: Stroke[] = strokes) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const s of nextStrokes) {
      if (s.points.length < 2) continue;
      ctx.lineWidth = s.width;
      ctx.strokeStyle = "rgba(255, 0, 0, 0.9)"; // red marker (simple)
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setIsDrawing(true);
    const p = getPos(e);
    setCurrentStroke({ points: [p], width: penWidth });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing || !currentStroke) return;
    const p = getPos(e);
    const updated: Stroke = {
      ...currentStroke,
      points: [...currentStroke.points, p],
    };
    setCurrentStroke(updated);

    // draw preview by combining strokes + currentStroke
    redraw([...strokes, updated]);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);

    const finalStroke = currentStroke.points.length > 1 ? currentStroke : null;
    setCurrentStroke(null);

    if (!finalStroke) return;

    const next = [...strokes, finalStroke];
    setStrokes(next);
    redraw(next);
  }

  function undo() {
    if (strokes.length === 0) return;
    const next = strokes.slice(0, -1);
    setStrokes(next);
    redraw(next);
  }

  function clearAll() {
    setStrokes([]);
    redraw([]);
  }

  async function saveAnnotatedCopy() {
    if (!imageUrl) return;
    if (strokes.length === 0) return alert("Nothing drawn yet.");

    setSaving(true);

    try {
      // Create an output canvas the same size as the image NATURAL size (so export is high-res)
      const img = imgRef.current!;
      const output = document.createElement("canvas");
      output.width = img.naturalWidth;
      output.height = img.naturalHeight;

      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("No canvas ctx");

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Scale strokes from displayed size -> natural size
      const displayW = img.getBoundingClientRect().width;
      const displayH = img.getBoundingClientRect().height;

      const scaleX = img.naturalWidth / displayW;
      const scaleY = img.naturalHeight / displayH;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";

      for (const s of strokes) {
        if (s.points.length < 2) continue;
        ctx.lineWidth = s.width * ((scaleX + scaleY) / 2); // keep roughly proportional

        ctx.beginPath();
        ctx.moveTo(s.points[0].x * scaleX, s.points[0].y * scaleY);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x * scaleX, s.points[i].y * scaleY);
        }
        ctx.stroke();
      }

      // Export
      const blob: Blob = await new Promise((resolve, reject) => {
        output.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9);
      });

      // Upload to storage
      const filePath = `${reportId}/annotated-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("report-images")
        .upload(filePath, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-images/${filePath}`;

      // Insert new DB row (copy)
      const { error: insertError } = await supabase.from("report_images").insert([
        {
          report_id: reportId,
          image_url: url,
          caption: "", // keep empty (user can fill later)
        },
      ]);

      if (insertError) throw insertError;

      alert("Annotated copy saved ✅");
      router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
    } catch (e: any) {
      console.error(e);
      alert("Failed to save annotation.");
    } finally {
      setSaving(false);
    }
  }


  async function replaceOriginal() {
  if (!imageUrl) return;
  if (strokes.length === 0) return alert("Nothing drawn yet.");

  const yes = confirm("Replace original image? This cannot be undone.");
  if (!yes) return;

  setSaving(true);

  try {
    // 1) Get current original URL from DB (so we can delete it later)
    const { data: row, error: rowErr } = await supabase
      .from("report_images")
      .select("image_url")
      .eq("id", imageId)
      .single();

    if (rowErr || !row?.image_url) throw rowErr || new Error("No original image_url");

    const originalPublicUrl = row.image_url;

    // --- 2) Build annotated image blob (same logic as save copy) ---
    const img = imgRef.current!;
    const output = document.createElement("canvas");
    output.width = img.naturalWidth;
    output.height = img.naturalHeight;

    const ctx = output.getContext("2d");
    if (!ctx) throw new Error("No canvas ctx");

    // Draw base
    ctx.drawImage(img, 0, 0);

    // Scale strokes from displayed -> natural
    const displayW = img.getBoundingClientRect().width;
    const displayH = img.getBoundingClientRect().height;

    const scaleX = img.naturalWidth / displayW;
    const scaleY = img.naturalHeight / displayH;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.9)";

    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.lineWidth = s.width * ((scaleX + scaleY) / 2);

      ctx.beginPath();
      ctx.moveTo(s.points[0].x * scaleX, s.points[0].y * scaleY);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * scaleX, s.points[i].y * scaleY);
      }
      ctx.stroke();
    }

    const blob: Blob = await new Promise((resolve, reject) => {
      output.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.9
      );
    });

    // 3) Upload new file
    const filePath = `${reportId}/replaced-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("report-images")
      .upload(filePath, blob, { contentType: "image/jpeg" });

    if (uploadError) throw uploadError;

    const newPublicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-images/${filePath}`;

    // 4) Update existing DB row
    const { error: updateErr } = await supabase
      .from("report_images")
      .update({ image_url: newPublicUrl })
      .eq("id", imageId);

    if (updateErr) throw updateErr;

    // 5) Delete old storage file (best effort)
    // Extract path after ".../public/report-images/"
    const marker = "/storage/v1/object/public/report-images/";
    const idx = originalPublicUrl.indexOf(marker);

    if (idx !== -1) {
      const oldPath = originalPublicUrl.substring(idx + marker.length);

      const { error: removeErr } = await supabase.storage
        .from("report-images")
        .remove([oldPath]);

      // Don't fail the whole flow if deletion fails
      if (removeErr) console.warn("Old file delete failed:", removeErr);
    } else {
      console.warn("Could not parse old storage path, skip delete");
    }

    alert("Original replaced ✅");
    router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
  } catch (e) {
    console.error(e);
    alert("Failed to replace original.");
  } finally {
    setSaving(false);
  }
}

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95"
        >
          Back
        </button>

        <div className="text-sm opacity-80">Draw</div>

        <button
          disabled={saving}
          onClick={saveAnnotatedCopy}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Copy"}
        </button>
<button
  disabled={saving}
  onClick={replaceOriginal}
  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-60"
>
  Replace
</button>
      </div>

      {/* Tools */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          onClick={undo}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95"
        >
          Undo
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95"
        >
          Clear
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs opacity-80">Pen</span>
          <input
            type="range"
            min={3}
            max={16}
            value={penWidth}
            onChange={(e) => setPenWidth(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Image + Canvas */}
      <div className="px-4 pb-6">
        <div className="relative rounded-xl overflow-hidden bg-black">
<img
  ref={imgRef}
  src={imageUrl}
  crossOrigin="anonymous"
  alt="Annotate"
  className="w-full max-h-[75vh] object-contain bg-black"
/>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </div>
        <p className="text-xs opacity-70 mt-3">
          Tip: guna jari untuk lukis.
        </p>
      </div>
    </div>
  );
}