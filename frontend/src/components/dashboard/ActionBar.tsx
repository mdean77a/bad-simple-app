"use client";

import { useState } from "react";
import type { ExportFormat } from "@/lib/api";
import type { SectionState } from "@/types/project";

interface ActionBarProps {
  sections?: SectionState[];
  onApproveAll?: () => void;
  onSaveProject?: () => void;
  onExport?: (format: ExportFormat) => Promise<void>;
}

export function ActionBar({ sections = [], onApproveAll, onSaveProject, onExport }: ActionBarProps) {
  const total = sections.length;
  const approvedCount = sections.filter((s) => s.status === "approved").length;
  const anyGenerating = sections.some(
    (s) => s.status === "generating" || s.status === "regenerating"
  );
  const allApproved = total > 0 && approvedCount === total;
  const hasApprovable = sections.some(
    (s) => s.status === "ready" || s.status === "edited"
  );

  const approveAllDisabled = !hasApprovable || anyGenerating;

  const [exportingFormats, setExportingFormats] = useState<Set<ExportFormat>>(new Set());

  const handleExport = async (format: ExportFormat) => {
    if (!onExport || exportingFormats.has(format)) return;
    setExportingFormats((prev) => new Set(prev).add(format));
    try {
      await onExport(format);
    } finally {
      setExportingFormats((prev) => {
        const next = new Set(prev);
        next.delete(format);
        return next;
      });
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: heading + progress */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              ICF Sections
            </h2>
            {total > 0 && (
              <span
                className="text-sm text-slate-500"
                aria-label={
                  anyGenerating
                    ? "Sections are generating"
                    : `${approvedCount} of ${total} sections approved`
                }
              >
                {anyGenerating ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                      />
                    </svg>
                    Generating...
                  </span>
                ) : allApproved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
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
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {approvedCount}/{total} approved
                  </span>
                ) : (
                  <span>{approvedCount}/{total} approved</span>
                )}
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={anyGenerating}
              onClick={onSaveProject}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save project"
            >
              Save Project
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
            <ExportButton
              label="PDF"
              format="pdf"
              colorClass="bg-red-600 hover:bg-red-700"
              disabled={!allApproved}
              loading={exportingFormats.has("pdf")}
              onClick={handleExport}
            />
            <ExportButton
              label="Word"
              format="docx"
              colorClass="bg-blue-600 hover:bg-blue-700"
              disabled={!allApproved}
              loading={exportingFormats.has("docx")}
              onClick={handleExport}
            />
            <ExportButton
              label="Markdown"
              format="md"
              colorClass="bg-teal-600 hover:bg-teal-700"
              disabled={!allApproved}
              loading={exportingFormats.has("md")}
              onClick={handleExport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  label,
  format,
  colorClass,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  format: ExportFormat;
  colorClass: string;
  disabled: boolean;
  loading: boolean;
  onClick: (format: ExportFormat) => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={() => onClick(format)}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${colorClass}`}
      aria-label={loading ? `Exporting ${label}` : `Export as ${label}`}
    >
      {loading && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-4 w-4 animate-spin"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
      )}
      {label}
    </button>
  );
}
