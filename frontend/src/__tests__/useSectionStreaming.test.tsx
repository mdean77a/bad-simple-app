import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { ProjectProvider, useProject } from "@/lib/project";
import { useSectionStreaming } from "@/hooks/useSectionStreaming";
import type { ConfirmedOutline, SectionState } from "@/types/project";
import type { SSEEvent } from "@/lib/sse";

jest.mock("@/lib/sse", () => ({
  streamSections: jest.fn(),
}));

import { streamSections } from "@/lib/sse";
const mockStreamSections = streamSections as jest.MockedFunction<typeof streamSections>;

const mockOutline: ConfirmedOutline = {
  sections: ["Purpose", "Risks"],
  confirmedAt: "2026-02-24T10:00:00Z",
  confirmedBy: { name: "Jane", email: "jane@example.com" },
};

function makeSections(overrides?: Partial<SectionState>[]): SectionState[] {
  const defaults: SectionState[] = [
    { id: "s1", name: "Purpose", content: "", status: "generating", originalPrompt: "" },
    { id: "s2", name: "Risks", content: "", status: "generating", originalPrompt: "" },
  ];
  if (!overrides) return defaults;
  return defaults.map((s, i) => ({ ...s, ...(overrides[i] || {}) }));
}

// Helper to make an async generator from events
async function* fakeStream(events: SSEEvent[]): AsyncGenerator<SSEEvent> {
  for (const e of events) {
    yield e;
  }
}

// Component that seeds project state, runs the hook, and exposes state via data attributes
function TestHarness({
  sections,
  children,
}: {
  sections: SectionState[];
  children?: React.ReactNode;
}) {
  const { project, confirmOutline, updateSection } = useProject();
  const [seeded, setSeeded] = React.useState(false);

  React.useEffect(() => {
    if (!seeded) {
      confirmOutline("proto_123", mockOutline, sections);
      setSeeded(true);
    }
  }, [seeded, confirmOutline, sections]);

  useSectionStreaming();

  return (
    <div>
      {project.sections.map((s) => (
        <div key={s.id} data-testid={`section-${s.id}`}>
          <span data-testid={`status-${s.id}`}>{s.status}</span>
          <span data-testid={`content-${s.id}`}>{s.content}</span>
        </div>
      ))}
      {children}
    </div>
  );
}

function renderWithHarness(sections: SectionState[]) {
  return render(
    <ProjectProvider>
      <TestHarness sections={sections} />
    </ProjectProvider>
  );
}

describe("useSectionStreaming", () => {
  beforeEach(() => {
    mockStreamSections.mockReset();
  });

  it("does not call streamSections when no sections are generating", async () => {
    const readySections = makeSections([{ status: "ready" }, { status: "ready" }]);
    renderWithHarness(readySections);

    // Wait for seeder effect to fire
    await waitFor(() => {
      expect(screen.getByTestId("status-s1")).toHaveTextContent("ready");
    });

    expect(mockStreamSections).not.toHaveBeenCalled();
  });

  it("calls streamSections with correct arguments", async () => {
    mockStreamSections.mockReturnValue(fakeStream([]));
    const sections = makeSections();
    renderWithHarness(sections);

    await waitFor(() => {
      expect(mockStreamSections).toHaveBeenCalledWith(
        "proto_123",
        [
          { id: "s1", name: "Purpose" },
          { id: "s2", name: "Risks" },
        ],
        expect.any(AbortSignal)
      );
    });
  });

  it("accumulates chunks and updates section content", async () => {
    const events: SSEEvent[] = [
      { event: "section_chunk", sectionId: "s1", content: "Hello " },
      { event: "section_chunk", sectionId: "s1", content: "world" },
    ];
    mockStreamSections.mockReturnValue(fakeStream(events));

    renderWithHarness(makeSections());

    await waitFor(() => {
      expect(screen.getByTestId("content-s1")).toHaveTextContent("Hello world");
    });
  });

  it("sets status to ready on section_complete", async () => {
    const events: SSEEvent[] = [
      { event: "section_chunk", sectionId: "s1", content: "Text" },
      { event: "section_complete", sectionId: "s1", status: "ready" },
    ];
    mockStreamSections.mockReturnValue(fakeStream(events));

    renderWithHarness(makeSections());

    await waitFor(() => {
      expect(screen.getByTestId("status-s1")).toHaveTextContent("ready");
    });
  });

  it("sets status to error on section_error", async () => {
    const events: SSEEvent[] = [
      { event: "section_error", sectionId: "s1", message: "LLM failed" },
    ];
    mockStreamSections.mockReturnValue(fakeStream(events));

    renderWithHarness(makeSections());

    await waitFor(() => {
      expect(screen.getByTestId("status-s1")).toHaveTextContent("error");
      expect(screen.getByTestId("content-s1")).toHaveTextContent("LLM failed");
    });
  });

  it("only starts streaming once (startedRef guard)", async () => {
    mockStreamSections.mockReturnValue(fakeStream([]));
    const sections = makeSections();

    const { rerender } = render(
      <ProjectProvider>
        <TestHarness sections={sections} />
      </ProjectProvider>
    );

    await waitFor(() => {
      expect(mockStreamSections).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ProjectProvider>
        <TestHarness sections={sections} />
      </ProjectProvider>
    );

    expect(mockStreamSections).toHaveBeenCalledTimes(1);
  });

  it("marks all generating sections as error on fetch failure", async () => {
    async function* failingStream(): AsyncGenerator<SSEEvent> {
      throw new Error("Network down");
    }
    mockStreamSections.mockReturnValue(failingStream());

    renderWithHarness(makeSections());

    await waitFor(() => {
      expect(screen.getByTestId("status-s1")).toHaveTextContent("error");
      expect(screen.getByTestId("status-s2")).toHaveTextContent("error");
      expect(screen.getByTestId("content-s1")).toHaveTextContent("Network down");
    });
  });

  it("aborts on unmount without error", async () => {
    let abortSignal: AbortSignal | undefined;
    async function* hangingStream(
      _p: string,
      _s: { id: string; name: string }[],
      signal?: AbortSignal
    ): AsyncGenerator<SSEEvent> {
      abortSignal = signal;
      await new Promise(() => {}); // never resolves
    }
    mockStreamSections.mockImplementation(hangingStream as typeof streamSections);

    const { unmount } = renderWithHarness(makeSections());

    await waitFor(() => {
      expect(mockStreamSections).toHaveBeenCalled();
    });

    unmount();

    expect(abortSignal?.aborted).toBe(true);
  });
});
