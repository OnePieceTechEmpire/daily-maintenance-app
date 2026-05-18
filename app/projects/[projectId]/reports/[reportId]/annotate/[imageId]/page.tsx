"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowUturnLeftIcon,
  TrashIcon,
  CheckIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; width: number; color: string };

const PEN_COLORS = [
  { value: "rgba(255,50,50,0.95)", label: "Red", bg: "bg-red-500" },
  { value: "rgba(255,220,0,0.95)", label: "Yellow", bg: "bg-yellow-400" },
  { value: "rgba(50,200,100,0.95)", label: "Green", bg: "bg-emerald-500" },
  { value: "rgba(50,150,255,0.95)", label: "Blue", bg: "bg-blue-500" },
  { value: "rgba(255,255,255,0.95)", label: "White", bg: "bg-white" },
];

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
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<"copy" | "replace" | null>(null);

  // Load image
  useEffect(() => {
    let objectUrl: string | null = null;
    (async () => {
      const { data, error } = await supabase.from("report_images").select("image_url").eq("id", imageId).single();
      if (error || !data) { router.replace(`/projects/${projectId}/reports/${reportId}/edit`); return; }
      try {
        const marker = "/storage/v1/object/public/report-images/";
        const idx = data.image_url.indexOf(marker);
        if (idx === -1) throw new Error("Bad image_url format");
        const path = data.image_url.substring(idx + marker.length);
        const { data: signed, error: signErr } = await supabase.storage.from("report-images").createSignedUrl(path, 60 * 10);
        if (signErr || !signed?.signedUrl) throw signErr;
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
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageId]);

  function syncCanvasSize() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const rect = img.getBoundingClientRect();
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
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
    const img = imgRef.current;
    if (img) img.onload = () => syncCanvasSize();
    return () => window.removeEventListener("resize", onResize);
  }, [imageUrl, strokes]);

  function getPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function redraw(nextStrokes: Stroke[] = strokes) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of nextStrokes) {
      if (s.points.length < 2) continue;
      ctx.lineWidth = s.width;
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentStroke({ points: [getPos(e)], width: penWidth, color: penColor });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing || !currentStroke) return;
    const updated: Stroke = { ...currentStroke, points: [...currentStroke.points, getPos(e)] };
    setCurrentStroke(updated);
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
    const next = strokes.slice(0, -1);
    setStrokes(next);
    redraw(next);
  }

  function clearAll() {
    setStrokes([]);
    redraw([]);
  }

  function buildAnnotatedBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = imgRef.current!;
      const output = document.createElement("canvas");
      output.width = img.naturalWidth;
      output.height = img.naturalHeight;
      const ctx = output.getContext("2d");
      if (!ctx) return reject(new Error("No canvas ctx"));
      ctx.drawImage(img, 0, 0);
      const displayW = img.getBoundingClientRect().width;
      const displayH = img.getBoundingClientRect().height;
      const scaleX = img.naturalWidth / displayW;
      const scaleY = img.naturalHeight / displayH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const s of strokes) {
        if (s.points.length < 2) continue;
        ctx.lineWidth = s.width * ((scaleX + scaleY) / 2);
        ctx.strokeStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(s.points[0].x * scaleX, s.points[0].y * scaleY);
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * scaleX, s.points[i].y * scaleY);
        ctx.stroke();
      }
      output.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", 0.9);
    });
  }

  async function saveAnnotatedCopy() {
    if (strokes.length === 0) return alert("Nothing drawn yet.");
    setSaving(true); setSaveMode("copy");
    try {
      const blob = await buildAnnotatedBlob();
      const filePath = `${reportId}/annotated-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("report-images").upload(filePath, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-images/${filePath}`;
      const { error: insertError } = await supabase.from("report_images").insert([{ report_id: reportId, image_url: url, caption: "" }]);
      if (insertError) throw insertError;
      router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
    } catch (e) { console.error(e); alert("Failed to save annotation."); }
    finally { setSaving(false); setSaveMode(null); }
  }

  async function replaceOriginal() {
    if (strokes.length === 0) return alert("Nothing drawn yet.");
    if (!confirm("Replace original image with annotated version? This cannot be undone.")) return;
    setSaving(true); setSaveMode("replace");
    try {
      const { data: row } = await supabase.from("report_images").select("image_url").eq("id", imageId).single();
      if (!row?.image_url) throw new Error("No original image_url");
      const blob = await buildAnnotatedBlob();
      const filePath = `${reportId}/replaced-${Date.now()}.jpg`;
      await supabase.storage.from("report-images").upload(filePath, blob, { contentType: "image/jpeg" });
      const newUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/report-images/${filePath}`;
      await supabase.from("report_images").update({ image_url: newUrl }).eq("id", imageId);
      const marker = "/storage/v1/object/public/report-images/";
      const idx = row.image_url.indexOf(marker);
      if (idx !== -1) await supabase.storage.from("report-images").remove([row.image_url.substring(idx + marker.length)]);
      router.replace(`/projects/${projectId}/reports/${reportId}/edit`);
    } catch (e) { console.error(e); alert("Failed to replace original."); }
    finally { setSaving(false); setSaveMode(null); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading image...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* SAFE AREA */}
      <div className="h-[env(safe-area-inset-top)]" />

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center active:scale-95 transition">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-white/80">Annotate</span>
        </div>

        {/* Save actions */}
        <div className="flex items-center gap-2">
          <button onClick={saveAnnotatedCopy} disabled={saving || strokes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-95 transition disabled:opacity-40">
            {saving && saveMode === "copy"
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <CheckIcon className="w-3.5 h-3.5" />}
            Save Copy
          </button>
          <button onClick={replaceOriginal} disabled={saving || strokes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-95 transition disabled:opacity-40">
            {saving && saveMode === "replace"
              ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : null}
            Replace
          </button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 flex items-center justify-center px-2 py-3">
        <div className="relative w-full max-h-[65vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
          <img ref={imgRef} src={imageUrl} crossOrigin="anonymous" alt="Annotate"
            className="w-full max-h-[65vh] object-contain" />
          <canvas ref={canvasRef} className="absolute inset-0 touch-none cursor-crosshair"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
        </div>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div className="px-4 pb-[env(safe-area-inset-bottom)] space-y-3">

        {/* Color picker */}
        <div className="flex items-center gap-2 justify-center">
          {PEN_COLORS.map((c) => (
            <button key={c.value} onClick={() => setPenColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition active:scale-95 ${c.bg} ${penColor === c.value ? "border-white scale-110 shadow-lg" : "border-white/20"}`}
            />
          ))}
        </div>

        {/* Pen size + tools */}
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
          {/* Undo */}
          <button onClick={undo} disabled={strokes.length === 0}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition disabled:opacity-30">
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button onClick={clearAll} disabled={strokes.length === 0}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition disabled:opacity-30">
            <TrashIcon className="w-4 h-4" />
          </button>

          {/* Pen size slider */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider shrink-0">Size</span>
            <input type="range" min={3} max={20} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))}
              className="flex-1 accent-white" />
            {/* Preview dot */}
            <div className="shrink-0 flex items-center justify-center w-6">
              <div className="rounded-full bg-white" style={{ width: Math.min(penWidth, 20), height: Math.min(penWidth, 20) }} />
            </div>
          </div>

          {/* Stroke count badge */}
          <span className="text-[10px] text-white/40 font-semibold shrink-0">
            {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Tip */}
        <p className="text-center text-[11px] text-white/30 pb-2">
          Draw with finger or stylus · Undo or clear anytime
        </p>
      </div>
    </div>
  );
}