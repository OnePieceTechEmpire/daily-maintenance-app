"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { WORKER_GROUPS } from "@/lib/workerTypes";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export default function ProjectWorkersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { userId, checking } = useAuthGuard();

  const [projectWorkerTypes, setProjectWorkerTypes] = useState<string[]>([]);
  const [projectCustomWorkerTypes, setProjectCustomWorkerTypes] = useState<
    { key: string; label: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!checking && userId) {
      loadWorkerSettings();
    }
  }, [checking, userId]);

  async function loadWorkerSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("worker_types, custom_worker_types")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Failed to load worker settings:", error);
      setLoading(false);
      return;
    }

    setProjectWorkerTypes(Array.isArray(data?.worker_types) ? data.worker_types : []);
    setProjectCustomWorkerTypes(
      Array.isArray(data?.custom_worker_types) ? data.custom_worker_types : []
    );
    setLoading(false);
  }

  function toggleWorkerType(key: string) {
    setProjectWorkerTypes((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }

  function makeWorkerKey(label: string) {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_");
  }

  async function saveWorkerSettings() {
    setSaving(true);
    setSavedSuccess(false);

    const cleanCustomWorkers = projectCustomWorkerTypes
      .map((item) => ({
        key: item.key || makeWorkerKey(item.label),
        label: item.label.trim(),
      }))
      .filter((item) => item.label);

    const { error } = await supabase
      .from("projects")
      .update({
        worker_types: projectWorkerTypes,
        custom_worker_types: cleanCustomWorkers,
      })
      .eq("id", projectId);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Failed to save worker settings.");
      return;
    }

    setProjectCustomWorkerTypes(cleanCustomWorkers);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  const totalSelected = projectWorkerTypes.length + projectCustomWorkerTypes.filter(i => i.label.trim()).length;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-4 pt-4 pb-9 max-w-lg mx-auto">

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-blue-300 hover:text-white transition mb-3 active:scale-[0.98]"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">Profile</span>
          </button>

          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            Project Settings
          </span>
          <div className="flex items-end justify-between mt-1">
            <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight">
              Worker Types
            </h1>
            {totalSelected > 0 && (
              <span className="mb-1 px-3 py-1 rounded-full bg-blue-700 text-blue-100 text-xs font-bold">
                {totalSelected} selected
              </span>
            )}
          </div>
          <p className="text-sm text-blue-200 mt-1 opacity-90">
            Choose worker types that appear in daily reports for this project.
          </p>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {checking || loading ? (
          <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading worker settings...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── STANDARD WORKER GROUPS ── */}
            {WORKER_GROUPS.map((group) => (
              <div key={group.title} className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    {group.title}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.items.map((item) => {
                    const checked = projectWorkerTypes.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition min-h-11
                          ${checked ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWorkerType(item.key)}
                          className="w-4 h-4 rounded accent-blue-600 shrink-0"
                        />
                        <span className={`text-sm leading-snug flex-1 ${checked ? "text-blue-800 font-medium" : "text-slate-600"}`}>
                          {item.label}
                        </span>
                        {checked && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ── CUSTOM WORKER TYPES ── */}
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5 space-y-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-0.5">
                  Custom Worker Types
                </span>
                <p className="text-xs text-slate-500">
                  Add project-specific worker types not listed above.
                </p>
              </div>

              {projectCustomWorkerTypes.length === 0 && (
                <p className="text-xs text-slate-400 italic py-1">No custom workers added yet.</p>
              )}

              {projectCustomWorkerTypes.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Welder"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={item.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const updated = [...projectCustomWorkerTypes];
                      updated[index] = { key: makeWorkerKey(label), label };
                      setProjectCustomWorkerTypes(updated);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setProjectCustomWorkerTypes((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="w-11 shrink-0 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition active:scale-[0.98] flex items-center justify-center min-h-11"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setProjectCustomWorkerTypes((prev) => [...prev, { key: "", label: "" }])
                }
                className="w-full py-3 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-11"
              >
                + Add Custom Worker Type
              </button>
            </div>

            {/* ── SAVE BUTTON ── */}
            <div className="space-y-2">
              <button
                onClick={saveWorkerSettings}
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm min-h-11 active:scale-[0.98] transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Worker Settings"}
              </button>

              {savedSuccess && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-3 h-3">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-emerald-600">Worker settings saved!</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}