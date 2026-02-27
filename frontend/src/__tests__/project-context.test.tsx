import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectProvider, useProject } from "@/lib/project";
import type { ConfirmedOutline, SectionState } from "@/types/project";

import type { OutlineSection } from "@/lib/api";

const mockGeneratedSections: OutlineSection[] = [
  {
    sectionName: "Purpose",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
  {
    sectionName: "Risks",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
];

import type { ProjectState } from "@/types/project";

function TestConsumer() {
  const {
    project,
    setProtocol,
    confirmOutline,
    loadProject,
    updateSection,
    cacheGeneratedOutline,
    updateCheckedState,
    unconfirmOutline,
    resetProject,
  } = useProject();
  return (
    <div>
      <p data-testid="has-outline">{project.outline ? "yes" : "no"}</p>
      <p data-testid="protocol-id">{project.protocolId}</p>
      <p data-testid="protocol-name">{project.protocolName}</p>
      <p data-testid="section-count">{project.sections.length}</p>
      <p data-testid="has-generated">
        {project.generatedOutline ? "yes" : "no"}
      </p>
      <p data-testid="checked-state">
        {project.generatedOutline
          ? JSON.stringify(project.generatedOutline.checkedState)
          : "null"}
      </p>
      {project.outline && (
        <>
          <p data-testid="confirmed-by">{project.outline.confirmedBy.name}</p>
          <p data-testid="section-names">
            {project.outline.sections.join(",")}
          </p>
        </>
      )}
      {project.sections.map((s) => (
        <p key={s.id} data-testid={`section-${s.name}`}>
          {s.status}
        </p>
      ))}
      <button
        onClick={() => {
          const outline: ConfirmedOutline = {
            sections: ["Purpose", "Risks"],
            confirmedAt: "2026-02-23T10:00:00Z",
            confirmedBy: { name: "Jane", email: "jane@example.com" },
          };
          const sections: SectionState[] = [
            {
              id: "uuid-1",
              name: "Purpose",
              content: "",
              status: "generating",
              originalPrompt: "",
            },
            {
              id: "uuid-2",
              name: "Risks",
              content: "",
              status: "generating",
              originalPrompt: "",
            },
          ];
          confirmOutline("proto-123", outline, sections);
        }}
      >
        Confirm
      </button>
      <button
        onClick={() =>
          cacheGeneratedOutline("proto-123", mockGeneratedSections, {
            Purpose: true,
            Risks: true,
          })
        }
      >
        Cache
      </button>
      <button
        onClick={() => updateCheckedState({ Purpose: false, Risks: true })}
      >
        Toggle
      </button>
      <button
        onClick={() =>
          updateSection("uuid-1", { content: "Updated content", status: "ready" })
        }
      >
        UpdateSection
      </button>
      <button onClick={unconfirmOutline}>Unconfirm</button>
      <button onClick={resetProject}>Reset</button>
      <button
        onClick={() => setProtocol("proto-abc", "Test Protocol Name")}
      >
        SetProtocol
      </button>
      <button
        onClick={() => {
          const loaded: ProjectState = {
            protocolId: "loaded-proto",
            protocolName: "Loaded Protocol",
            outline: {
              sections: ["Background"],
              confirmedAt: "2026-02-01T00:00:00Z",
              confirmedBy: { name: "Loader", email: "loader@test.com" },
            },
            sections: [
              {
                id: "loaded-1",
                name: "Background",
                content: "Loaded content",
                status: "approved",
                originalPrompt: "prompt",
                approval: {
                  userName: "Loader",
                  userEmail: "loader@test.com",
                  timestamp: "2026-02-01T00:00:00Z",
                },
              },
            ],
            generatedOutline: null,
          };
          loadProject(loaded);
        }}
      >
        LoadProject
      </button>
    </div>
  );
}

describe("ProjectContext", () => {
  it("starts with no outline and empty sections", () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    expect(screen.getByTestId("has-outline")).toHaveTextContent("no");
    expect(screen.getByTestId("protocol-id")).toHaveTextContent("");
    expect(screen.getByTestId("section-count")).toHaveTextContent("0");
  });

  it("stores confirmed outline and sections on confirmOutline", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Confirm"));

    expect(screen.getByTestId("has-outline")).toHaveTextContent("yes");
    expect(screen.getByTestId("protocol-id")).toHaveTextContent("proto-123");
    expect(screen.getByTestId("section-count")).toHaveTextContent("2");
    expect(screen.getByTestId("confirmed-by")).toHaveTextContent("Jane");
    expect(screen.getByTestId("section-names")).toHaveTextContent(
      "Purpose,Risks"
    );
    expect(screen.getByTestId("section-Purpose")).toHaveTextContent(
      "generating"
    );
    expect(screen.getByTestId("section-Risks")).toHaveTextContent("generating");
  });

  it("resets state on resetProject", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(screen.getByTestId("has-outline")).toHaveTextContent("yes");

    await userEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("has-outline")).toHaveTextContent("no");
    expect(screen.getByTestId("protocol-id")).toHaveTextContent("");
    expect(screen.getByTestId("section-count")).toHaveTextContent("0");
  });

  it("caches generated outline sections", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Cache"));

    expect(screen.getByTestId("has-generated")).toHaveTextContent("yes");
    expect(screen.getByTestId("protocol-id")).toHaveTextContent("proto-123");
    expect(screen.getByTestId("checked-state")).toHaveTextContent(
      '{"Purpose":true,"Risks":true}'
    );
  });

  it("updates checked state in cached outline", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Cache"));
    await userEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("checked-state")).toHaveTextContent(
      '{"Purpose":false,"Risks":true}'
    );
  });

  it("clears confirmed outline but keeps cached data on unconfirm", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Cache"));
    await userEvent.click(screen.getByText("Confirm"));
    expect(screen.getByTestId("has-outline")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-generated")).toHaveTextContent("yes");

    await userEvent.click(screen.getByText("Unconfirm"));
    expect(screen.getByTestId("has-outline")).toHaveTextContent("no");
    expect(screen.getByTestId("section-count")).toHaveTextContent("0");
    expect(screen.getByTestId("has-generated")).toHaveTextContent("yes");
  });

  it("updates a specific section via updateSection", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("Confirm"));
    expect(screen.getByTestId("section-Purpose")).toHaveTextContent(
      "generating"
    );

    await userEvent.click(screen.getByText("UpdateSection"));
    expect(screen.getByTestId("section-Purpose")).toHaveTextContent("ready");
    // Risks section should be unchanged
    expect(screen.getByTestId("section-Risks")).toHaveTextContent("generating");
  });

  it("updateCheckedState is no-op when no generated outline exists", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    // Toggle without caching first — generatedOutline is null
    await userEvent.click(screen.getByText("Toggle"));

    expect(screen.getByTestId("has-generated")).toHaveTextContent("no");
    expect(screen.getByTestId("checked-state")).toHaveTextContent("null");
  });

  it("sets protocolId and protocolName on setProtocol", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    await userEvent.click(screen.getByText("SetProtocol"));

    expect(screen.getByTestId("protocol-id")).toHaveTextContent("proto-abc");
    expect(screen.getByTestId("protocol-name")).toHaveTextContent("Test Protocol Name");
  });

  it("preserves protocolName through confirmOutline", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    // First set protocol name
    await userEvent.click(screen.getByText("SetProtocol"));
    expect(screen.getByTestId("protocol-name")).toHaveTextContent("Test Protocol Name");

    // Then confirm outline (which uses ...state spread, preserving protocolName)
    await userEvent.click(screen.getByText("Confirm"));
    expect(screen.getByTestId("protocol-name")).toHaveTextContent("Test Protocol Name");
  });

  it("replaces entire project state on loadProject", async () => {
    render(
      <ProjectProvider>
        <TestConsumer />
      </ProjectProvider>
    );

    // First confirm something so there's existing state
    await userEvent.click(screen.getByText("Confirm"));
    expect(screen.getByTestId("protocol-id")).toHaveTextContent("proto-123");
    expect(screen.getByTestId("section-count")).toHaveTextContent("2");

    // Now load a completely different project
    await userEvent.click(screen.getByText("LoadProject"));

    expect(screen.getByTestId("protocol-id")).toHaveTextContent("loaded-proto");
    expect(screen.getByTestId("has-outline")).toHaveTextContent("yes");
    expect(screen.getByTestId("section-count")).toHaveTextContent("1");
    expect(screen.getByTestId("confirmed-by")).toHaveTextContent("Loader");
    expect(screen.getByTestId("section-names")).toHaveTextContent("Background");
    expect(screen.getByTestId("section-Background")).toHaveTextContent("approved");
  });

  it("throws error when useProject is used outside ProjectProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useProject must be used within a ProjectProvider"
    );

    consoleSpy.mockRestore();
  });
});
