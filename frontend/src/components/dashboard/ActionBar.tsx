"use client";

import type { SectionState } from "@/types/project";

interface ActionBarProps {
  sections?: SectionState[];
  onApproveAll?: () => void;
}

export function ActionBar({ sections = [], onApproveAll }: ActionBarProps) {
  const anyGenerating = sections.some(
    (s) => s.status === "generating" || s.status === "regenerating"
  );
  const allApproved =
    sections.length > 0 && sections.every((s) => s.status === "approved");
  const hasApprovable = sections.some(
    (s) => s.status === "ready" || s.status === "edited"
  );

  const approveAllDisabled = !hasApprovable || anyGenerating;

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">ICF Sections</h2>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Regenerate All
          </button>
          {allApproved ? (
            <button
              disabled
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="All sections approved"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              All Approved
            </button>
          ) : (
            <button
              disabled={approveAllDisabled}
              onClick={onApproveAll}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Approve all sections"
            >
              Approve All Sections
            </button>
          )}
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            PDF
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Word
          </button>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Markdown
          </button>
        </div>
      </div>
    </div>
  );
}
