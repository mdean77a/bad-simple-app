"use client";

import { useCallback, useRef, useState } from "react";
import { uploadProtocol, ApiError } from "@/lib/api";

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "uploading" }
  | { status: "success"; protocolName: string }
  | { status: "error"; message: string };

export function ProtocolUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setState({ status: "uploading" });
    try {
      const result = await uploadProtocol(file);
      setState({ status: "success", protocolName: result.protocolName });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail
          : "An unexpected error occurred. Please try again.";
      setState({ status: "error", message });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState({ status: "idle" });
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState({ status: "dragging" });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState({ status: "idle" });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleTryAgain = useCallback(() => {
    setState({ status: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  if (state.status === "uploading") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <p className="mt-4 text-sm font-medium text-violet-700">
          Processing protocol...
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 p-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-emerald-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="mt-4 text-lg font-semibold text-emerald-800">
          {state.protocolName}
        </p>
        <p className="mt-1 text-sm text-emerald-600">
          Protocol uploaded successfully
        </p>
        <button
          disabled
          className="mt-6 rounded-lg bg-violet-600 px-6 py-2.5 font-medium text-white opacity-50 cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-red-300 bg-red-50 p-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-red-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p
          className="mt-4 text-sm font-medium text-red-700"
          aria-live="assertive"
        >
          {state.message}
        </p>
        <button
          onClick={handleTryAgain}
          className="mt-4 rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isDragging = state.status === "dragging";

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      aria-label="Upload protocol PDF"
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
        isDragging
          ? "border-violet-500 bg-violet-50"
          : "border-slate-300 bg-white hover:border-violet-400 hover:bg-slate-50"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-slate-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
      <p className="mt-4 text-sm text-slate-600">
        Drag and drop your protocol PDF here, or
      </p>
      <button
        onClick={handleBrowseClick}
        className="mt-2 rounded-lg bg-violet-600 px-6 py-2.5 font-medium text-white hover:bg-violet-700"
      >
        Browse Files
      </button>
      <p className="mt-3 text-xs text-slate-400">PDF files only</p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
        data-testid="file-input"
      />
    </div>
  );
}
