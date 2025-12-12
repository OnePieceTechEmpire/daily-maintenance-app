"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function createProject() {
    setLoading(true);

    const { data, error } = await supabase.from("projects").insert([
      {
        name,
        description,
      },
    ]).select().single();

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Error creating project");
      return;
    }

    // redirect to project dashboard
    router.push(`/projects/${data.id}/dashboard`);
  }

return (
  <div className="min-h-screen bg-gray-100 p-4">

    {/* BACK BUTTON AT TOP */}
    <button
      onClick={() => router.back()}
      className="p-2 mb-6 rounded-xl bg-white shadow hover:bg-gray-100 text-gray-700 transition active:scale-95"
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

    {/* CENTER CARD */}
    <div className="flex justify-center items-center">
      <div className="w-full max-w-xl bg-white shadow-sm border border-gray-200 rounded-2xl p-6">
        {/* HEADER */}
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Create New Project
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up a new site to start recording daily maintenance reports.
        </p>
      </div>

      {/* FORM */}
      <div className="space-y-5">

        {/* PROJECT NAME */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. Lakeside Residence – Unit 12A Renovation"
            className="
              w-full px-4 py-3 rounded-xl border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:outline-none
            "
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* PROJECT DESCRIPTION */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Project Description (optional)
          </label>
          <textarea
            placeholder="Brief description of the project, location, or scope of work..."
            className="
              w-full px-4 py-3 rounded-xl border border-gray-300 h-32 resize-none
              focus:ring-2 focus:ring-blue-500 focus:outline-none
            "
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={createProject}
          disabled={loading || !name.trim()}
          className={`
            w-full py-3 rounded-xl text-lg font-semibold text-white
            transition active:scale-95
            ${
              loading || !name.trim()
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
);

}
