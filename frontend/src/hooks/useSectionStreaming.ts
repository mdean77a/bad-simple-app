"use client";

import { useEffect, useRef } from "react";
import { useProject } from "@/lib/project";
import { streamSections } from "@/lib/sse";

export function useSectionStreaming(
  provider?: string,
  model?: string,
): void {
  const { project, updateSection } = useProject();
  const startedRef = useRef(false);
  const sectionsRef = useRef(project.sections);
  const updateSectionRef = useRef(updateSection);
  sectionsRef.current = project.sections;
  updateSectionRef.current = updateSection;

  // Derive a stable boolean so the effect doesn't re-run on every chunk update
  const hasGenerating = project.sections.some(
    (s) => s.status === "generating"
  );
  const protocolId = project.protocolId;
  const effectiveProvider = provider ?? "";
  const effectiveModel = model ?? "";

  useEffect(() => {
    if (!hasGenerating || !protocolId) return;
    if (startedRef.current) return;

    startedRef.current = true;

    const generatingSections = sectionsRef.current.filter(
      (s) => s.status === "generating"
    );
    const controller = new AbortController();
    const contentAccum: Record<string, string> = {};

    (async () => {
      try {
        const sectionsInput = generatingSections.map((s) => ({
          id: s.id,
          name: s.name,
        }));

        for await (const event of streamSections(
          protocolId,
          sectionsInput,
          controller.signal,
          effectiveProvider || undefined,
          effectiveModel || undefined,
        )) {
          switch (event.event) {
            case "section_chunk": {
              const prev = contentAccum[event.sectionId] || "";
              contentAccum[event.sectionId] = prev + event.content;
              updateSectionRef.current(event.sectionId, {
                content: contentAccum[event.sectionId],
              });
              break;
            }
            case "section_complete":
              updateSectionRef.current(event.sectionId, { status: "ready" });
              break;
            case "section_error":
              updateSectionRef.current(event.sectionId, {
                status: "error",
                content: event.message,
              });
              break;
            // section_start: no-op (already in generating state)
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Mark all still-generating sections as error
        for (const s of generatingSections) {
          updateSectionRef.current(s.id, {
            status: "error",
            content: String(err),
          });
        }
      }
    })();

    return () => {
      controller.abort();
      startedRef.current = false;
    };
  }, [hasGenerating, protocolId, effectiveProvider, effectiveModel]);
}
