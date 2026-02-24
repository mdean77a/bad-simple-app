import type { ReactNode } from "react";
import type { SectionStatus } from "@/types/project";

const statusConfig: Record<
  SectionStatus,
  { bg: string; label: string; icon: ReactNode }
> = {
  generating: {
    bg: "bg-amber-400",
    label: "Generating",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  ready: {
    bg: "bg-teal-500",
    label: "Ready",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    ),
  },
  editing: {
    bg: "bg-blue-500",
    label: "Editing",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
      />
    ),
  },
  edited: {
    bg: "bg-slate-400",
    label: "Edited",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
      />
    ),
  },
  approved: {
    bg: "bg-emerald-500",
    label: "Approved",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    ),
  },
  error: {
    bg: "bg-red-500",
    label: "Error",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    ),
  },
};

interface StatusIconProps {
  status: SectionStatus;
}

export function StatusIcon({ status }: StatusIconProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bg}`}
      aria-label={config.label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="white"
        className="h-4 w-4"
      >
        {config.icon}
      </svg>
    </div>
  );
}
