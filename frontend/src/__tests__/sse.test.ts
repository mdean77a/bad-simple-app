import { streamSections, streamSectionRegenerate, type SSEEvent } from "@/lib/sse";

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } =
  require("util");
globalThis.TextEncoder = globalThis.TextEncoder || NodeTextEncoder;
globalThis.TextDecoder = globalThis.TextDecoder || NodeTextDecoder;

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

function mockFetchSSE(sseText: string) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(sseText);
  let read = false;

  const mockBody = {
    getReader: () => ({
      read: async () => {
        if (!read) {
          read = true;
          return { done: false, value: encoded };
        }
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn(),
    }),
  };

  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    body: mockBody,
  });
}

function mockFetchSSEChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;

  const mockBody = {
    getReader: () => ({
      read: async () => {
        if (index < chunks.length) {
          const value = encoder.encode(chunks[index]);
          index++;
          return { done: false, value };
        }
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn(),
    }),
  };

  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    body: mockBody,
  });
}

async function collectEvents(
  protocolId: string,
  sections: { id: string; name: string }[],
  signal?: AbortSignal
): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  for await (const event of streamSections(protocolId, sections, signal)) {
    events.push(event);
  }
  return events;
}

describe("streamSections", () => {
  it("parses section_start events", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"s1","name":"Purpose"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_start", sectionId: "s1", name: "Purpose" },
    ]);
  });

  it("parses section_chunk events", async () => {
    const sseText =
      'event: section_chunk\ndata: {"sectionId":"s1","content":"Hello "}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s1","content":"world"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_chunk", sectionId: "s1", content: "Hello " },
      { event: "section_chunk", sectionId: "s1", content: "world" },
    ]);
  });

  it("parses section_complete events", async () => {
    const sseText =
      'event: section_complete\ndata: {"sectionId":"s1","status":"ready"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_complete", sectionId: "s1", status: "ready" },
    ]);
  });

  it("parses section_error events", async () => {
    const sseText =
      'event: section_error\ndata: {"sectionId":"s1","message":"Something broke"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_error", sectionId: "s1", message: "Something broke" },
    ]);
  });

  it("handles multi-section sequence", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"s1","name":"Purpose"}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s1","content":"Text"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"s1","status":"ready"}\n\n' +
      'event: section_start\ndata: {"sectionId":"s2","name":"Risks"}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s2","content":"Risk text"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"s2","status":"ready"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [
      { id: "s1", name: "Purpose" },
      { id: "s2", name: "Risks" },
    ]);

    expect(events).toHaveLength(6);
    expect(events[0]).toEqual({ event: "section_start", sectionId: "s1", name: "Purpose" });
    expect(events[3]).toEqual({ event: "section_start", sectionId: "s2", name: "Risks" });
  });

  it("skips malformed JSON in data lines", async () => {
    const sseText =
      'event: section_chunk\ndata: {INVALID}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s1","content":"valid"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_chunk", sectionId: "s1", content: "valid" },
    ]);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      body: null,
    });

    await expect(
      collectEvents("proto1", [{ id: "s1", name: "Purpose" }])
    ).rejects.toThrow("Stream request failed: 500 Internal Server Error");
  });

  it("throws on network error", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      collectEvents("proto1", [{ id: "s1", name: "Purpose" }])
    ).rejects.toThrow("Failed to fetch");
  });

  it("sends correct fetch parameters", async () => {
    const sseText = 'event: section_start\ndata: {"sectionId":"s1","name":"P"}\n\n';
    mockFetchSSE(sseText);

    await collectEvents("proto_abc", [
      { id: "s1", name: "Purpose" },
      { id: "s2", name: "Risks" },
    ]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sections/generate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolId: "proto_abc",
          sections: [
            { id: "s1", name: "Purpose" },
            { id: "s2", name: "Risks" },
          ],
        }),
      })
    );
  });

  it("handles data split across chunks", async () => {
    // First chunk ends mid-line, second chunk completes it
    mockFetchSSEChunks([
      'event: section_chunk\ndata: {"sectionId":"s1","con',
      'tent":"hello"}\n\n',
    ]);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_chunk", sectionId: "s1", content: "hello" },
    ]);
  });

  it("defaults error message when missing", async () => {
    const sseText =
      'event: section_error\ndata: {"sectionId":"s1"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectEvents("proto1", [{ id: "s1", name: "Purpose" }]);

    expect(events).toEqual([
      { event: "section_error", sectionId: "s1", message: "Unknown error" },
    ]);
  });
});

// --- streamSectionRegenerate ---

async function collectRegenEvents(
  protocolId: string,
  sectionId: string,
  sectionName: string,
  originalPrompt: string,
  guidance: string | null,
  signal?: AbortSignal,
): Promise<SSEEvent[]> {
  const events: SSEEvent[] = [];
  for await (const event of streamSectionRegenerate(
    protocolId, sectionId, sectionName, originalPrompt, guidance, signal,
  )) {
    events.push(event);
  }
  return events;
}

describe("streamSectionRegenerate", () => {
  it("sends correct fetch parameters", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"s1","name":"Purpose"}\n\n';
    mockFetchSSE(sseText);

    await collectRegenEvents("proto_abc", "s1", "Purpose", "Write it", "Be concise");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sections/regenerate"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolId: "proto_abc",
          sectionId: "s1",
          sectionName: "Purpose",
          originalPrompt: "Write it",
          guidance: "Be concise",
        }),
      }),
    );
  });

  it("sends null guidance when not provided", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"s1","name":"Purpose"}\n\n';
    mockFetchSSE(sseText);

    await collectRegenEvents("proto_abc", "s1", "Purpose", "Write it", null);

    const call = (globalThis.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.guidance).toBeNull();
  });

  it("parses full SSE event sequence", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"s1","name":"Purpose"}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s1","content":"New "}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"s1","content":"content"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"s1","status":"ready"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectRegenEvents("proto1", "s1", "Purpose", "Write it", null);

    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ event: "section_start", sectionId: "s1", name: "Purpose" });
    expect(events[1]).toEqual({ event: "section_chunk", sectionId: "s1", content: "New " });
    expect(events[2]).toEqual({ event: "section_chunk", sectionId: "s1", content: "content" });
    expect(events[3]).toEqual({ event: "section_complete", sectionId: "s1", status: "ready" });
  });

  it("parses section_error event", async () => {
    const sseText =
      'event: section_error\ndata: {"sectionId":"s1","message":"LLM failed"}\n\n';
    mockFetchSSE(sseText);

    const events = await collectRegenEvents("proto1", "s1", "Purpose", "Write it", null);

    expect(events).toEqual([
      { event: "section_error", sectionId: "s1", message: "LLM failed" },
    ]);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      body: null,
    });

    await expect(
      collectRegenEvents("proto1", "s1", "Purpose", "Write it", null)
    ).rejects.toThrow("Stream request failed: 500 Internal Server Error");
  });
});
