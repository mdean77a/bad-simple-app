export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  detail: string;

  constructor(code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.code = code;
    this.detail = detail;
  }
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

export interface UploadResult {
  protocolId: string;
  protocolName: string;
  acronym: string;
}

export interface Protocol {
  protocolId: string;
  protocolName: string;
  acronym: string;
  indexedAt: string;
}

export async function fetchProtocols(): Promise<Protocol[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch protocols: ${response.status}`);
  }
  return response.json();
}

export interface OutlineSection {
  sectionName: string;
  category: "standard" | "conditional" | "signature";
  isConditional: boolean;
  defaultChecked: boolean;
  detectionReason: string | null;
}

export interface OutlineResult {
  protocolId: string;
  sections: OutlineSection[];
}

export async function generateOutline(
  protocolId: string
): Promise<OutlineResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/outline/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocolId }),
  });

  if (!response.ok) {
    let body: { code?: string; detail?: string };
    try {
      body = await response.json();
    } catch {
      throw new Error(`Outline generation failed: ${response.status}`);
    }
    throw new ApiError(
      body.code || "UNKNOWN_ERROR",
      body.detail || "Outline generation failed"
    );
  }

  return response.json();
}

export type ExportFormat = "md" | "pdf" | "docx";

export interface ExportSection {
  id: string;
  name: string;
  content: string;
}

export interface ExportApproval {
  sectionId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
}

export async function exportDocument(
  sections: ExportSection[],
  approvals: ExportApproval[],
  format: ExportFormat,
  protocolName: string,
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/export/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sections, approvals, format, protocolName }),
  });

  if (!response.ok) {
    let body: { code?: string; detail?: string };
    try {
      body = await response.json();
    } catch {
      throw new Error(`Export failed: ${response.status}`);
    }
    throw new ApiError(
      body.code || "UNKNOWN_ERROR",
      body.detail || "Export failed",
    );
  }

  return response.blob();
}

export async function uploadProtocol(
  file: File,
  acronym: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("acronym", acronym);

  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let body: { code?: string; detail?: string };
    try {
      body = await response.json();
    } catch {
      throw new Error(`Upload failed: ${response.status}`);
    }
    throw new ApiError(
      body.code || "UNKNOWN_ERROR",
      body.detail || "Upload failed"
    );
  }

  return response.json();
}
