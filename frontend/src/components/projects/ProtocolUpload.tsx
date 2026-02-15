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
  const [acronym, setAcronym] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [acronymError, setAcronymError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAcronym = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "Protocol acronym is required";
    if (trimmed.length < 5) return "Acronym must be at least 5 characters";
    if (trimmed.length > 15) return "Acronym must be at most 15 characters";
    return null;
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    const error = validateAcronym(acronym);
    if (error) {
      setAcronymError(error);
      return;
    }
    setState({ status: "uploading" });
    try {
      const result = await uploadProtocol(selectedFile, acronym.trim());
      setState({ status: "success", protocolName: result.protocolName });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail
          : "An unexpected error occurred. Please try again.";
      setState({ status: "error", message });
    }
  }, [selectedFile, acronym, validateAcronym]);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState({ status: "idle" });
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
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
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleTryAgain = useCallback(() => {
    setState({ status: "idle" });
    setSelectedFile(null);
    setAcronym("");
    setAcronymError(null);
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
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-label="Upload protocol PDF"
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          isDragging
            ? "border-violet-500 bg-violet-50"
            : selectedFile
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-300 bg-white hover:border-violet-400 hover:bg-slate-50"
        }`}
      >
        {selectedFile ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-emerald-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-emerald-700">
              {selectedFile.name}
            </p>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="mt-2 text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Change file
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          data-testid="file-input"
        />
      </div>

      <div>
        <label
          htmlFor="acronym"
          className="block text-sm font-medium text-slate-700"
        >
          Protocol Acronym
        </label>
        <input
          id="acronym"
          type="text"
          value={acronym}
          onChange={(e) => {
            setAcronym(e.target.value);
            if (acronymError) setAcronymError(null);
          }}
          placeholder="e.g., THAPCA, FLUID, PRECISE"
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
            acronymError
              ? "border-red-300 focus:ring-red-500"
              : "border-slate-300"
          }`}
          maxLength={15}
        />
        {acronymError && (
          <p className="mt-1 text-sm text-red-600" aria-live="polite">
            {acronymError}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">5-15 characters</p>
      </div>

      <button
        onClick={handleUpload}
        disabled={!selectedFile}
        className={`w-full rounded-lg px-6 py-2.5 font-medium text-white ${
          selectedFile
            ? "bg-violet-600 hover:bg-violet-700"
            : "bg-violet-300 cursor-not-allowed"
        }`}
      >
        Upload Protocol
      </button>
    </div>
  );
}
