"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";

type Props = {
  projectId: string;
};

export default function ProjectBottomNav({ projectId }: Props) {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      href: `/projects/${projectId}/dashboard`,
      icon: HomeIcon,
      match: `/projects/${projectId}/dashboard`,
    },
    {
      label: "Reports",
      href: `/projects/${projectId}/reports`,
      icon: DocumentTextIcon,
      match: `/projects/${projectId}/reports`,
    },
    {
      label: "Calendar",
      href: `/projects/${projectId}/calendar`,
      icon: CalendarDaysIcon,
      match: `/projects/${projectId}/calendar`,
    },
    {
      label: "Profile",
      href: `/projects/${projectId}/profile`,
      icon: UserCircleIcon,
      match: `/projects/${projectId}/profile`,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-5xl px-4 pb-3">
        <div className="bg-white/95 backdrop-blur border border-gray-200 shadow-xl rounded-2xl px-2 py-2">
          <div className="grid grid-cols-4 gap-1">
            {items.map((item) => {
              const isActive = pathname === item.match;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center gap-1
                    rounded-xl py-2.5 px-2 text-xs font-semibold transition active:scale-95
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-500 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-00" : "text-gray-400"}`} />
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