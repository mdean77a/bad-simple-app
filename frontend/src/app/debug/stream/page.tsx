"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

interface StreamEvent {
  event: string;
  data: Record<string, string>;
}

interface SectionInput {
  id: string;
  name: string;
}

export default function DebugStreamPage() {
  const searchParams = useSearchParams();

  const paramProtocolId = searchParams.get("protocolId") || "";
  const paramSections = searchParams.get("sections") || "";

  const [protocolId, setProtocolId] = useState(paramProtocolId);
  const [sectionName, setSectionName] = useState("");
  const [output, setOutput] = useState("");
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoStarted = useRef(false);

  const startStream = useCallback(
    async (pid: string, sections: SectionInput[]) => {
      if (!pid.trim() || sections.length === 0) return;

      setOutput("");
      setEvents([]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/sections/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ protocolId: pid, sections }),
            signal: controller.signal,
          }
        );

        if (!response.ok || !response.body) {
          setOutput(`Error: ${response.status} ${response.statusText}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7);
            } else if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                setEvents((prev) => [...prev, { event: currentEvent, data }]);

                if (currentEvent === "section_start") {
                  setOutput((prev) =>
                    prev + (prev ? "\n\n" : "") + `=== ${data.name} ===\n`
                  );
                } else if (currentEvent === "section_chunk" && data.content) {
                  setOutput((prev) => prev + data.content);
                } else if (currentEvent === "section_error") {
                  setOutput(
                    (prev) =>
                      prev + `\n\n[ERROR] ${data.message || "Unknown error"}`
                  );
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setOutput((prev) => prev + "\n\n[Aborted]");
        } else {
          setOutput((prev) => prev + `\n\n[Error: ${String(err)}]`);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  // Auto-start when arriving from outline confirmation with query params
  useEffect(() => {
    if (autoStarted.current) return;
    if (!paramProtocolId || !paramSections) return;

    try {
      const sections: SectionInput[] = JSON.parse(paramSections);
      if (sections.length > 0) {
        autoStarted.current = true;
        startStream(paramProtocolId, sections);
      }
    } catch {
      // invalid JSON in params, ignore
    }
  }, [paramProtocolId, paramSections, startStream]);

  function handleGenerate() {
    if (!protocolId.trim() || !sectionName.trim()) return;
    startStream(protocolId, [{ id: "debug-1", name: sectionName }]);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace", maxWidth: "800px" }}>
      <h1>Debug: Section Streaming</h1>
      <p style={{ color: "#666" }}>
        Throwaway page for testing SSE section generation.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="protocolId">Protocol ID: </label>
        <input
          id="protocolId"
          type="text"
          value={protocolId}
          onChange={(e) => setProtocolId(e.target.value)}
          placeholder="protocol_example_20260101000000"
          style={{ width: "400px", padding: "4px" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="sectionName">Section Name: </label>
        <input
          id="sectionName"
          type="text"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          placeholder="Purpose of the Study"
          style={{ width: "400px", padding: "4px" }}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleGenerate}
          disabled={isStreaming || !protocolId.trim() || !sectionName.trim()}
        >
          Generate
        </button>
        {isStreaming && (
          <button onClick={handleStop} style={{ marginLeft: "8px" }}>
            Stop
          </button>
        )}
      </div>

      <h2>Output</h2>
      <pre
        data-testid="stream-output"
        style={{
          background: "#f5f5f5",
          padding: "1rem",
          minHeight: "200px",
          whiteSpace: "pre-wrap",
          border: "1px solid #ccc",
        }}
      >
        {output || "(no output yet)"}
      </pre>

      <h2>Events ({events.length})</h2>
      <pre
        data-testid="events-log"
        style={{
          background: "#f0f0f0",
          padding: "1rem",
          maxHeight: "300px",
          overflow: "auto",
          fontSize: "0.85rem",
          border: "1px solid #ccc",
        }}
      >
        {events.length > 0
          ? events
              .map(
                (e, i) =>
                  `[${i}] ${e.event}: ${JSON.stringify(e.data)}`
              )
              .join("\n")
          : "(no events yet)"}
      </pre>
    </div>
  );
}
