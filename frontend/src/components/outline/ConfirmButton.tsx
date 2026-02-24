"use client";

interface ConfirmButtonProps {
  disabled: boolean;
  hasNoSelections: boolean;
  onClick: () => void;
}

export function ConfirmButton({
  disabled,
  hasNoSelections,
  onClick,
}: ConfirmButtonProps) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label="Confirm outline and begin generation"
        aria-describedby={hasNoSelections ? "confirm-helper" : undefined}
        className="w-full rounded-lg bg-emerald-500 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-500"
      >
        Confirm Outline
      </button>
      {hasNoSelections && (
        <p
          id="confirm-helper"
          className="text-sm text-slate-500"
          role="status"
        >
          Select at least one section to continue
        </p>
      )}
    </div>
  );
}
