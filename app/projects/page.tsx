"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ProjectsListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
const [sort, setSort] = useState("newest");




  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    setProjects(data || []);
    setLoading(false);
  }

  function openProject(id: string) {
    router.push(`/projects/${id}/dashboard`);
  }

  function newProject() {
    router.push(`/projects/new`);
  }

  const toTime = (value: any) => new Date(value).getTime();

  const projectsFiltered = projects
  .filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  )
.sort((a, b) => {
  if (sort === "newest") return toTime(b.created_at) - toTime(a.created_at);
  if (sort === "oldest") return toTime(a.created_at) - toTime(b.created_at);
  if (sort === "az") return a.name.localeCompare(b.name);
  if (sort === "za") return b.name.localeCompare(a.name);
});


return (
  <div className="min-h-screen bg-gray-100">

    {/* HERO SECTION */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white rounded-b-3xl shadow-lg">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Projects</h1>

          {/* Desktop Add Button */}
          <button
            onClick={newProject}
            className="hidden md:block bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-50 active:scale-95"
          >
            + Add Project
          </button>
        </div>

        <p className="text-blue-100 mt-1 text-sm">
          Manage daily maintenance reports with ease
        </p>

        {/* Search + Sort */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">

          {/* Search */}
<div className="relative w-full">
  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

  <input
    type="text"
    placeholder="Search projects..."
    className="w-full pl-10 pr-4 py-2 rounded-lg shadow-sm border border-blue-200 bg-white 
               focus:ring-2 focus:ring-blue-300 focus:outline-none text-gray-800"
    onChange={(e) => setSearch(e.target.value)}
  />
</div>


          {/* Sort Dropdown 
          <select
            className="px-4 py-2 rounded-lg shadow-sm border border-blue-200 text-gray-800 focus:ring-2 focus:ring-blue-300"
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>*/}

        </div>
      </div>
    </div>

    <div className="p-5 max-w-6xl mx-auto">

      {/* Empty State */}
      {!loading && projectsFiltered.length === 0 && (
        <div className="flex flex-col items-center mt-20 text-center">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
            className="w-28 opacity-80 mb-4"
          />
          <h2 className="text-xl font-semibold text-gray-700">No Projects Found</h2>
          <p className="text-gray-500 max-w-xs mt-2 mb-4">
            Try adjusting your search or create a new project.
          </p>

          <button
            onClick={newProject}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow active:scale-95"
          >
            + Add Project
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && projectsFiltered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          {projectsFiltered.map((p) => (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              className="
                bg-white rounded-2xl shadow-sm border border-gray-200 p-5 cursor-pointer
                hover:shadow-md hover:border-blue-400 transition-all active:scale-[0.98]
                flex flex-col
              "
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{p.name}</h2>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {p.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Status Tag */}
                <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                  Active
                </span>
              </div>

              <div className="text-xs text-gray-400 mt-4">
                Created: {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* MOBILE FLOATING ADD BUTTON */}
    <button
      onClick={newProject}
      className="
        md:hidden fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg
        flex items-center justify-center text-3xl font-bold hover:bg-blue-700 active:scale-90
      "
    >
      +
    </button>
  </div>
);



}
