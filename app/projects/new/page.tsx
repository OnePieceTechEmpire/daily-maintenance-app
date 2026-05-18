"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { WORKER_GROUPS } from "@/lib/workerTypes";
import {
  MapPinIcon,
  LanguageIcon,
  FolderIcon,
  UserGroupIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

export default function NewProjectPage() {
  const router = useRouter();
  const { userId, checking } = useAuthGuard();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [workerTypes, setWorkerTypes] = useState<string[]>([]);
  const [customWorkerTypes, setCustomWorkerTypes] = useState<{ key: string; label: string }[]>([]);
  const [error, setError] = useState("");

  function makeWorkerKey(label: string) {
    return label.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "_");
  }

  function toggleWorkerType(key: string) {
    setWorkerTypes((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    );
  }

  function handleNext() {
    setError("");
    if (!name.trim()) return setError("Please enter a project name.");
    if (!location.trim()) return setError("Please enter a project location.");
    setStep(2);
  }

  async function createProject() {
    if (checking) return;
    setError("");
    if (!userId) return setError("Please login first.");

    setLoading(true);

    const cleanCustomWorkers = customWorkerTypes
      .map((item) => ({ key: item.key || makeWorkerKey(item.label), label: item.label.trim() }))
      .filter((item) => item.label);

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert([{
        name,
        location,
        description,
        output_language: outputLanguage,
        worker_types: workerTypes,
        custom_worker_types: cleanCustomWorkers,
        created_by: userId,
      }])
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError("Failed to create project. Please try again.");
      return;
    }

    router.push(`/projects/${data.id}/dashboard`);
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm";
  const labelClass = "text-xs font-semibold text-slate-500 block mb-1.5";
  const totalSelected = workerTypes.length + customWorkerTypes.filter((i) => i.label.trim()).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">

          <button
            onClick={() => step === 1 ? router.back() : setStep(1)}
            className="flex items-center gap-1.5 text-blue-300 hover:text-white transition mb-3 active:scale-[0.98]"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{step === 1 ? "Projects" : "Back"}</span>
          </button>

          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            New Project
          </span>
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">
            {step === 1 ? "Project Details" : "Worker Types"}
          </h1>
          <p className="text-sm text-blue-200 mt-1.5 opacity-90">
            {step === 1
              ? "Fill in the basic details for your project."
              : "Select workers for daily reports. You can edit this later."}
          </p>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-white"
                  : s < step ? "w-4 bg-blue-400"
                  : "w-4 bg-blue-700"
                }`}
              />
            ))}
            <span className="text-[10px] text-blue-300 font-semibold ml-1">
              Step {step} of 2
            </span>
          </div>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg w-full mx-auto px-4 -mt-1 pb-16 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FolderIcon className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">Project Details</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className={labelClass}>Project Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Lakeside Residence – Unit 12A"
                    className={inputClass}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Project Location <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <MapPinIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. Kuala Lumpur, Malaysia"
                      className={`${inputClass} pl-10`}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Project Description</label>
                  <textarea
                    placeholder="Brief description of the project scope or notes..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none h-24 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Report Output Language</label>
                  <div className="relative">
                    <LanguageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      className={`${inputClass} pl-10`}
                      value={outputLanguage}
                      onChange={(e) => setOutputLanguage(e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Bahasa Melayu">Bahasa Melayu</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!name.trim() || !location.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white min-h-11 active:scale-[0.98] transition bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next — Configure Workers →
            </button>
          </div>
        )}

        {/* ══ STEP 2 ══ */}
        {step === 2 && (
          <div className="space-y-4">

            {/* Info callout */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-sm text-blue-700 font-medium leading-relaxed">
                This step is <span className="font-bold">optional</span>. Skip and configure worker types later from{" "}
                <span className="font-bold">Profile → Worker Types</span>.
              </p>
            </div>

            {/* Worker groups */}
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <UserGroupIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Standard Worker Types</p>
                </div>
                {totalSelected > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                    {totalSelected} selected
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {WORKER_GROUPS.map((group) => (
                  <div key={group.title} className="px-5 py-4">
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                      {group.title}
                    </p>
                    <div className="divide-y divide-slate-100 rounded-xl overflow-hidden border border-slate-200">
                      {group.items.map((item) => {
                        const checked = workerTypes.includes(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition min-h-11
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
                            {checked && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom workers */}
              <div className="px-5 pb-5 pt-2 space-y-3 border-t border-slate-100">
                <div className="pt-2">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">
                    Custom Worker Types
                  </p>
                  <p className="text-xs text-slate-400">Add project-specific types not listed above.</p>
                </div>

                {customWorkerTypes.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Welder"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      value={item.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        const updated = [...customWorkerTypes];
                        updated[index] = { key: makeWorkerKey(label), label };
                        setCustomWorkerTypes(updated);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomWorkerTypes((prev) => prev.filter((_, i) => i !== index))}
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
                  onClick={() => setCustomWorkerTypes((prev) => [...prev, { key: "", label: "" }])}
                  className="w-full py-3 rounded-xl border border-dashed border-blue-300 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition active:scale-[0.98] min-h-11"
                >
                  + Add Custom Worker Type
                </button>
              </div>
            </div>

            {/* Create button */}
            <button
              onClick={createProject}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white min-h-11 active:scale-[0.98] transition bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating Project...
                </span>
              ) : totalSelected > 0
                ? `Create Project · ${totalSelected} worker${totalSelected !== 1 ? "s" : ""} selected`
                : "Create Project"}
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={createProject}
              disabled={loading}
              className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50 disabled:opacity-60"
            >
              Skip — Configure Workers Later
            </button>

            <p className="text-center text-xs text-slate-400 pb-2">
              Worker types can be updated anytime from Profile → Worker Types.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}