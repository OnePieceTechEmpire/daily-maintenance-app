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
} from "@heroicons/react/24/outline";

export default function NewProjectPage() {
  const router = useRouter();
  const { userId, checking } = useAuthGuard();
  

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [workerTypes, setWorkerTypes] = useState<string[]>([]);
  const [customWorkerTypes, setCustomWorkerTypes] = useState<
  { key: string; label: string }[]
>([]);

function makeWorkerKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "_");
}

  function toggleWorkerType(key: string) {
  setWorkerTypes((prev) =>
    prev.includes(key)
      ? prev.filter((item) => item !== key)
      : [...prev, key]
  );
}

  async function createProject() {
    if (checking) return;
    if (!userId) return alert("Please login first.");
    if (!name.trim()) return alert("Please enter project name.");
    if (!location.trim()) return alert("Please enter project location.");

    setLoading(true);

const { data, error } = await supabase
  .from("projects")
  .insert([
    {
      name,
      location,
      description,
      output_language: outputLanguage,
      worker_types: workerTypes,
      custom_worker_types: customWorkerTypes,
      created_by: userId,
    },
  ])
  .select()
  .single();

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error creating project");
      return;
    }

    router.push(`/projects/${data.id}/dashboard`);
  }

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="p-2 mb-4 rounded-xl bg-white shadow-sm hover:bg-gray-50 text-gray-700 transition active:scale-95"
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

        <div className="bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 text-white shadow-lg px-6 py-8">
            <h1 className="text-2xl font-bold">Create New Project</h1>
            <p className="text-sm text-blue-100 mt-1">
              Set up your project before creating daily site reports.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Project Details */}
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FolderIcon className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Project Details</h2>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lakeside Residence – Unit 12A Renovation"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Project Location
                </label>
                <div className="relative">
                  <MapPinIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Kuala Lumpur, Malaysia"
                    className={`${inputClass} pl-11`}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
    Project Description
  </label>

  <textarea
    placeholder="Brief description of the project scope or notes..."
    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-28"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
</div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Output Language
                </label>
                <div className="relative">
                  <LanguageIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    className={`${inputClass} pl-11 bg-white`}
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Bahasa Melayu">Bahasa Melayu</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
  <div>
    <h2 className="font-semibold text-gray-800">Worker Types for This Project</h2>
    <p className="text-sm text-gray-500 mt-1">
      Select the worker types you want to appear in daily reports.
    </p>
  </div>

  {WORKER_GROUPS.map((group) => (
    <div key={group.title} className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">{group.title}</h3>

      <div className="space-y-2">
        {group.items.map((item) => {
          const checked = workerTypes.includes(item.key);

          return (
            <label
              key={item.key}
              className={`
                flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer
                ${checked
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"}
              `}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleWorkerType(item.key)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                {item.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  ))}
</section>

<section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
  <div>
    <h2 className="font-semibold text-gray-800">Custom Worker Types</h2>
    <p className="text-sm text-gray-500 mt-1">
      Add your own worker types for this project if needed.
    </p>
  </div>

  {(customWorkerTypes || []).map((item, index) => (
    <div key={index} className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="e.g. Welder"
        className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        value={item.label}
        onChange={(e) => {
          const updated = [...customWorkerTypes];
          const label = e.target.value;
          updated[index] = {
            key: makeWorkerKey(label),
            label,
          };
          setCustomWorkerTypes(updated);
        }}
      />

      <button
        type="button"
        onClick={() => {
          const updated = customWorkerTypes.filter((_, i) => i !== index);
          setCustomWorkerTypes(updated);
        }}
        className="px-3 py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50"
      >
        ✕
      </button>
    </div>
  ))}

  <button
    type="button"
    onClick={() => {
      setCustomWorkerTypes((prev) => [
        ...prev,
        { key: "", label: "" },
      ]);
    }}
    className="w-full py-3 rounded-2xl border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50"
  >
    + Add Custom Worker Type
  </button>
</section>

            {/* Submit */}
            <div className="pt-1">
              <button
                onClick={createProject}
                disabled={loading || !name.trim() || !location.trim()}
                className={`
                  w-full py-3.5 rounded-2xl text-base font-semibold text-white
                  transition active:scale-95
                  ${
                    loading || !name.trim() || !location.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
              >
                {loading ? "Creating Project..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}