"use client";

import { OutlineSection } from "@/lib/api";

interface OutlineChecklistProps {
  sections: OutlineSection[];
  checkedState: Record<string, boolean>;
  onToggle: (sectionName: string) => void;
}

const CATEGORY_CONFIG: Record<string, { title: string; order: number }> = {
  standard: { title: "Standard Sections", order: 1 },
  conditional: { title: "Conditional Sections", order: 2 },
  signature: { title: "Signature Pages", order: 3 },
};

export function OutlineChecklist({
  sections,
  checkedState,
  onToggle,
}: OutlineChecklistProps) {
  const grouped = sections.reduce(
    (acc, section) => {
      const cat = section.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(section);
      return acc;
    },
    {} as Record<string, OutlineSection[]>
  );

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) =>
      CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order
  );

  const leftCategories = sortedCategories.filter((c) => c === "standard");
  const rightCategories = sortedCategories.filter((c) => c !== "standard");

  const renderCategory = (category: string) => (
    <fieldset key={category}>
      <legend className="text-lg font-semibold text-slate-800">
        {CATEGORY_CONFIG[category].title}
      </legend>
      <div className="mt-3 space-y-3">
        {grouped[category].map((section) => (
          <label
            key={section.sectionName}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={checkedState[section.sectionName]}
              onChange={() => onToggle(section.sectionName)}
              className="mt-0.5 h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-800">
                {section.sectionName}
              </span>
              {section.detectionReason && (
                <p className="mt-1 text-xs text-slate-500">
                  {section.detectionReason}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div
      className="grid grid-cols-1 gap-8 md:grid-cols-2"
      role="form"
      aria-label="Outline checklist"
    >
      <div className="space-y-8">
        {leftCategories.map(renderCategory)}
      </div>
      <div className="space-y-8">
        {rightCategories.map(renderCategory)}
      </div>
    </div>
  );
}
