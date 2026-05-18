"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";
import Image from "next/image";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MapPinIcon, CalendarDaysIcon, PlusIcon } from "@heroicons/react/24/solid";

export default function ProjectsListPage() {
  const router = useRouter();
  const { userId, checking } = useAuthGuard();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!checking && userId) loadProjects();
  }, [checking, userId]);

  async function loadProjects() {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setProjects(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const toTime = (v: any) => new Date(v).getTime();

  const projectsFiltered = useMemo(() =>
    projects
      .filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sort === "newest") return toTime(b.created_at) - toTime(a.created_at);
        if (sort === "oldest") return toTime(a.created_at) - toTime(b.created_at);
        if (sort === "az") return a.name.localeCompare(b.name);
        if (sort === "za") return b.name.localeCompare(a.name);
        return 0;
      }),
    [projects, search, sort]
  );

  function getProjectInitial(name: string) {
    return name?.trim()?.charAt(0)?.toUpperCase() || "?";
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("#avatar-menu")) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">

          {/* Top row — logo + avatar menu */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logs.png"
                alt="SiteDiary2U"
                width={36}
                height={36}
                className="rounded-xl"
                priority
              />
              <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
                SiteDiary2U
              </span>
            </div>

            {/* Avatar / menu */}
            <div className="relative" id="avatar-menu">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-blue-700 hover:bg-blue-600 flex items-center justify-center transition active:scale-[0.97] border-2 border-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-44 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight">
            My Projects
          </h1>
          <p className="text-sm text-blue-200 mt-1 opacity-90">
            {projects.length > 0
              ? `${projects.length} project${projects.length !== 1 ? "s" : ""}`
              : "No projects yet"}
          </p>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32 space-y-4 -mt-1">

        {/* SEARCH + SORT */}
        <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Sort */}
          <select
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {/* LOADING */}
        {(checking || loading) && (
          <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">
                {checking ? "Checking session..." : "Loading projects..."}
              </span>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!checking && !loading && projectsFiltered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-700 text-base">
                {search ? "No projects found" : "No projects yet"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {search ? "Try a different search term." : "Create your first project to get started."}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => router.push("/projects/new")}
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl active:scale-[0.98] transition"
              >
                <PlusIcon className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        )}

        {/* PROJECT LIST */}
        {!checking && !loading && projectsFiltered.length > 0 && (
          <>
            <div className="px-0.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Projects
              </span>
              {search && (
                <span className="text-[10px] font-bold text-blue-500">
                  {projectsFiltered.length} result{projectsFiltered.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {projectsFiltered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}/dashboard`)}
                  className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-4 cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4"
                >
                  {/* Initial avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-lg font-bold text-white">
                      {getProjectInitial(p.name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {p.location && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <MapPinIcon className="w-3 h-3 shrink-0" />
                          {p.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <CalendarDaysIcon className="w-3 h-3 shrink-0" />
                        {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* FLOATING ADD BUTTON */}
      <button
        onClick={() => router.push("/projects/new")}
        className="fixed bottom-8 right-5 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition z-40"
      >
        <PlusIcon className="w-7 h-7" />
      </button>
    </div>
  );
}