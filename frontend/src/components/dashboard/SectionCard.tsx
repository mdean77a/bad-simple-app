import type { SectionState, SectionStatus } from "@/types/project";
import { StatusIcon } from "@/components/common/StatusIcon";

const borderColors: Record<SectionStatus, string> = {
  generating: "border-l-amber-400",
  ready: "border-l-slate-400",
  editing: "border-l-blue-400",
  edited: "border-l-slate-400",
  approved: "border-l-emerald-500",
  error: "border-l-red-500",
};

const statusLabels: Record<SectionStatus, string> = {
  generating: "Generating...",
  ready: "Ready for review",
  editing: "Editing",
  edited: "Edited",
  approved: "Approved",
  error: "Error",
};

function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

interface SectionCardProps {
  section: SectionState;
}

export function SectionCard({ section }: SectionCardProps) {
  const titleId = `section-title-${section.id}`;
  const isGenerating = section.status === "generating";
  const words = wordCount(section.content);

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-lg border border-slate-200 bg-white p-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon status={section.status} />
          <h3 id={titleId} className="text-base font-semibold text-slate-900">
            {section.name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Approve ${section.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Approve
          </button>
          <button
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Edit ${section.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
              />
            </svg>
            Edit
          </button>
          <button
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Regenerate ${section.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Regenerate
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <p className="mt-2 text-sm text-slate-500">
        {words} words &middot; Status: {statusLabels[section.status]}
      </p>

      {/* Content area */}
      <div
        className={`mt-4 rounded-md border-l-4 bg-slate-50 p-4 ${borderColors[section.status]}`}
      >
        {isGenerating && !section.content ? (
          <div className="space-y-3" data-testid="section-skeleton">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {section.content}
          </p>
        )}
      </div>
    </article>
  );
}
