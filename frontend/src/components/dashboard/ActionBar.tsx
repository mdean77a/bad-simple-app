export function ActionBar() {
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
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve All Sections
          </button>
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
