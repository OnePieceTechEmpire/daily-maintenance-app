"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";

type Props = { projectId: string };

export default function ProjectBottomNav({ projectId }: Props) {
  const pathname = usePathname();

  const items = [
    { label: "Home",     href: `/projects/${projectId}/dashboard`, icon: HomeIcon,          match: `/projects/${projectId}/dashboard` },
    { label: "Reports",  href: `/projects/${projectId}/reports`,   icon: DocumentTextIcon,  match: `/projects/${projectId}/reports` },
    { label: "Calendar", href: `/projects/${projectId}/calendar`,  icon: CalendarDaysIcon,  match: `/projects/${projectId}/calendar` },
    { label: "Profile",  href: `/projects/${projectId}/profile`,   icon: UserCircleIcon,    match: `/projects/${projectId}/profile` },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* safe area bottom untuk iPhone */}
      <div className="bg-white/95" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-lg mx-auto px-3 pt-2 pb-2">
          <div className="bg-white border border-slate-200 rounded-2xl px-1 py-1 grid grid-cols-4">
            {items.map((item) => {
              const isActive = pathname === item.match;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-2 text-[11px] font-semibold transition active:scale-95 min-h-[56px] ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}