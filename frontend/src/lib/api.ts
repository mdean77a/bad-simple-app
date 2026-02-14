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
}

export async function uploadProtocol(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

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
