"use client";

import { useState } from "react";

interface RegenerateModalProps {
  sectionName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (guidance: string) => void;
}

export function RegenerateModal({
  sectionName,
  isOpen,
  onClose,
  onSubmit,
}: RegenerateModalProps) {
  const [guidance, setGuidance] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(guidance.trim());
    setGuidance("");
  };

  const handleClose = () => {
    setGuidance("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-label={`Regenerate ${sectionName}`}
    >
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Regenerate: {sectionName}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Provide optional guidance to improve the regenerated content.
        </p>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          placeholder="e.g. Use simpler language, be more concise, add more detail about risks..."
          className="mt-4 w-full resize-y rounded-md border border-slate-300 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={4}
          aria-label="Guidance for regeneration"
        />
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
