import { API_BASE_URL } from "@/lib/api";

export type SSEEvent =
  | { event: "section_start"; sectionId: string; name: string }
  | { event: "section_chunk"; sectionId: string; content: string }
  | { event: "section_complete"; sectionId: string; status: string }
  | { event: "section_error"; sectionId: string; message: string };

async function* readSSEStream(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7);
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === "section_start") {
              yield { event: "section_start", sectionId: data.sectionId, name: data.name };
            } else if (currentEvent === "section_chunk") {
              yield { event: "section_chunk", sectionId: data.sectionId, content: data.content };
            } else if (currentEvent === "section_complete") {
              yield { event: "section_complete", sectionId: data.sectionId, status: data.status };
            } else if (currentEvent === "section_error") {
              yield { event: "section_error", sectionId: data.sectionId, message: data.message || "Unknown error" };
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamSections(
  protocolId: string,
  sections: { id: string; name: string }[],
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sections/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocolId, sections }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  }

  yield* readSSEStream(response);
}

export async function* streamSectionRegenerate(
  protocolId: string,
  sectionId: string,
  sectionName: string,
  originalPrompt: string,
  guidance: string | null,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sections/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocolId, sectionId, sectionName, originalPrompt, guidance }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
  }

  yield* readSSEStream(response);
}
