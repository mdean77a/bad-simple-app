"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProtocols, Protocol } from "@/lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; protocols: Protocol[] };

interface ProtocolSelectProps {
  disabled?: boolean;
  onSelectionChange?: (protocolId: string | null, protocolName: string | null) => void;
}

export function ProtocolSelect({
  disabled,
  onSelectionChange,
}: ProtocolSelectProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const handleSelect = useCallback(
    (protocolId: string, protocolName: string) => {
      setSelectedId(protocolId);
      setOpen(false);
      onSelectionChange?.(protocolId || null, protocolName || null);
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
  const selectedProtocol = state.protocols.find(
    (p) => p.protocolId === selectedId
  );

  return (
    <div
      className={`relative space-y-3 ${disabled ? "opacity-50" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        aria-label="Select a protocol"
        aria-expanded={open}
        onClick={() => !isDisabled && setOpen((prev) => !prev)}
        disabled={isDisabled}
        className={`flex w-full items-center rounded-lg border-2 bg-white px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
          isDisabled
            ? "border-slate-200 text-slate-400 cursor-not-allowed"
            : "border-slate-300 text-slate-800 focus:border-violet-500"
        }`}
      >
        <span className="flex-1 truncate">
          {selectedProtocol ? (
            <>
              <span className="font-bold">{selectedProtocol.acronym}</span>{" "}
              {selectedProtocol.protocolName}
            </>
          ) : hasProtocols ? (
            "Select a protocol..."
          ) : (
            "No protocols uploaded yet"
          )}
        </span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {state.protocols.map((protocol) => (
            <li
              key={protocol.protocolId}
              role="option"
              aria-selected={protocol.protocolId === selectedId}
              onClick={() => handleSelect(protocol.protocolId, protocol.protocolName)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-violet-50 ${
                protocol.protocolId === selectedId ? "bg-violet-50" : ""
              }`}
            >
              <span className="font-bold whitespace-nowrap">
                {protocol.acronym}
              </span>
              <span className="flex-1 truncate text-slate-600">
                {protocol.protocolName}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {formatDate(protocol.indexedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}
