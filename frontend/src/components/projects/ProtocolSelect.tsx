"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProtocols, Protocol } from "@/lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; protocols: Protocol[] };

interface ProtocolSelectProps {
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export function ProtocolSelect({
  disabled,
  onSelectionChange,
}: ProtocolSelectProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState("");

  const loadProtocols = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const protocols = await fetchProtocols();
      setState({ status: "loaded", protocols });
    } catch {
      setState({
        status: "error",
        message: "Failed to load protocols. Please try again.",
      });
    }
  }, []);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  const handleChange = useCallback(
    (value: string) => {
      setSelectedId(value);
      onSelectionChange?.(value !== "");
    },
    [onSelectionChange]
  );

  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-label="Loading protocols">
        <div className="h-10 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 border-red-300 bg-red-50 p-8">
        <p className="text-sm text-red-700" aria-live="assertive">
          {state.message}
        </p>
        <button
          onClick={loadProtocols}
          className="mt-4 rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasProtocols = state.protocols.length > 0;
  const isDisabled = disabled || !hasProtocols;

  return (
    <div className={`space-y-3 ${disabled ? "opacity-50" : ""}`}>
      <select
        aria-label="Select a protocol"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isDisabled}
        className={`w-full rounded-lg border-2 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
          isDisabled
            ? "border-slate-200 text-slate-400 cursor-not-allowed"
            : "border-slate-300 text-slate-800 focus:border-violet-500"
        }`}
      >
        <option value="">
          {hasProtocols ? "Select a protocol..." : "No protocols uploaded yet"}
        </option>
        {state.protocols.map((protocol) => (
          <option key={protocol.protocolId} value={protocol.protocolId}>
            {protocol.protocolName} — Indexed {formatDate(protocol.indexedAt)}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatDate(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
