import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/projects/[id]/page";
import { AuthProvider } from "@/lib/auth";
import { ProjectProvider, useProject } from "@/lib/project";
import { downloadProjectFile } from "@/lib/projectFile";
import type { ConfirmedOutline, SectionState } from "@/types/project";

jest.mock("@/hooks/useSectionStreaming", () => ({
  useSectionStreaming: jest.fn(),
}));

jest.mock("@/lib/sse", () => ({
  streamSectionRegenerate: jest.fn(),
}));

jest.mock("@/lib/projectFile", () => ({
  ...jest.requireActual("@/lib/projectFile"),
  downloadProjectFile: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  exportDocument: jest.fn(),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({ id: "protocol_test_123" }),
}));

const mockOutline: ConfirmedOutline = {
  sections: ["Purpose of the Study", "Study Procedures"],
  confirmedAt: "2026-02-23T10:00:00Z",
  confirmedBy: { name: "Jane", email: "jane@example.com" },
};

const mockSections: SectionState[] = [
  {
    id: "uuid-1",
    name: "Purpose of the Study",
    content: "",
    status: "generating",
    originalPrompt: "",
  },
  {
    id: "uuid-2",
    name: "Study Procedures",
    content: "The study will involve several procedures.",
    status: "ready",
    originalPrompt: "",
  },
];

// Helper that pre-populates ProjectContext with a confirmed outline
function PrePopulatedProvider({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <Seeder />
      {children}
    </ProjectProvider>
  );
}

function Seeder() {
  const { confirmOutline } = useProject();
  const [seeded, setSeeded] = React.useState(false);
  React.useEffect(() => {
    if (!seeded) {
      confirmOutline("protocol_test_123", mockOutline, mockSections);
      setSeeded(true);
    }
  }, [seeded, confirmOutline]);
  return null;
}

import React from "react";

const renderWithOutline = () => {
  return render(
    <AuthProvider>
      <PrePopulatedProvider>
        <DashboardPage />
      </PrePopulatedProvider>
    </AuthProvider>
  );
};

// Helper for tests that need a custom set of sections
function CustomSeeder({ sections }: { sections: SectionState[] }) {
  const { confirmOutline } = useProject();
  const [seeded, setSeeded] = React.useState(false);
  React.useEffect(() => {
    if (!seeded) {
      confirmOutline("protocol_test_123", mockOutline, sections);
      setSeeded(true);
    }
  }, [seeded, confirmOutline, sections]);
  return null;
}

const renderWithSections = (sections: SectionState[]) => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <CustomSeeder sections={sections} />
        <DashboardPage />
      </ProjectProvider>
    </AuthProvider>
  );
};

describe("Dashboard Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it("redirects to / when user is not logged in", async () => {
    renderWithOutline();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("renders nothing when no outline is confirmed", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    render(
      <AuthProvider>
        <ProjectProvider>
          <DashboardPage />
        </ProjectProvider>
      </AuthProvider>
    );

    expect(screen.queryByText("Section Dashboard")).not.toBeInTheDocument();
  });

  it("renders section cards with names", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: "Purpose of the Study" })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { level: 3, name: "Study Procedures" })
    ).toBeInTheDocument();
  });

  it("renders ActionBar with ICF Sections heading", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "ICF Sections" })
      ).toBeInTheDocument();
    });
  });

  it("renders section cards as articles", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(2);
    });
  });

  it("shows skeleton for generating section and content for ready section", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(screen.getByTestId("section-skeleton")).toBeInTheDocument();
    });

    expect(
      screen.getByText("The study will involve several procedures.")
    ).toBeInTheDocument();
  });

  it("navigates to outline page when 'Change Outline' back button is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const button = await screen.findByRole("button", {
      name: /go back to Change Outline/i,
    });
    await userEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith(
      "/projects/protocol_test_123/outline"
    );
  });

  it("clears confirmed outline when 'Change Outline' back button is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const button = await screen.findByRole("button", {
      name: /go back to Change Outline/i,
    });
    await userEvent.click(button);

    // After unconfirm, outline is null so section cards disappear
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { level: 3, name: "Purpose of the Study" })
      ).not.toBeInTheDocument();
    });
  });

  it("renders page header with Section Dashboard title", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Section Dashboard" })
      ).toBeInTheDocument();
    });
  });

  it("clicking Approve on a ready section changes it to approved", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const approveBtn = await screen.findByRole("button", {
      name: /approve study procedures/i,
    });
    await userEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("Approved")).toBeInTheDocument();
    });
    // Approve button should be gone after approval
    expect(
      screen.queryByRole("button", { name: /approve study procedures/i })
    ).not.toBeInTheDocument();
  });

  it("wraps sections in a main element", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    await waitFor(() => {
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  // --- Inline editing integration tests ---

  it("clicking Edit on a ready section changes status to editing", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const editBtn = await screen.findByRole("button", {
      name: /edit study procedures/i,
    });
    await userEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Status: Editing/)).toBeInTheDocument();
    });
    // Textarea should be visible
    expect(
      screen.getByRole("textbox", { name: /edit content for study procedures/i })
    ).toBeInTheDocument();
  });

  it("editing text and clicking Save changes status to edited and updates content", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const editBtn = await screen.findByRole("button", {
      name: /edit study procedures/i,
    });
    await userEvent.click(editBtn);

    const textarea = screen.getByRole("textbox", {
      name: /edit content for study procedures/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated procedures content.");

    await userEvent.click(
      screen.getByRole("button", { name: /save study procedures/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Status: Edited/)).toBeInTheDocument();
    });
    expect(
      screen.getByText("Updated procedures content.")
    ).toBeInTheDocument();
  });

  it("clicking Cancel restores original status and content", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const editBtn = await screen.findByRole("button", {
      name: /edit study procedures/i,
    });
    await userEvent.click(editBtn);

    const textarea = screen.getByRole("textbox", {
      name: /edit content for study procedures/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Temporary changes");

    await userEvent.click(
      screen.getByRole("button", { name: /cancel editing study procedures/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Status: Ready for review/)).toBeInTheDocument();
    });
    // Original content should be shown (not the temporary changes)
    expect(
      screen.getByText("The study will involve several procedures.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Temporary changes")).not.toBeInTheDocument();
  });

  // --- Regenerate modal integration tests ---

  it("clicking Regenerate opens the modal", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /regenerate study procedures/i })
      ).toBeInTheDocument();
    });
  });

  it("clicking Cancel in regenerate modal closes it", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderWithOutline();

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("submitting regenerate modal sets section to generating", async () => {
    const { streamSectionRegenerate } = require("@/lib/sse");

    // Return an async generator that completes immediately
    async function* fakeStream() {
      // no events — just end
    }
    streamSectionRegenerate.mockReturnValue(fakeStream());

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    // Use sections where "Study Procedures" is ready (not generating)
    const readySections: SectionState[] = [
      {
        id: "uuid-2",
        name: "Study Procedures",
        content: "The study will involve several procedures.",
        status: "ready",
        originalPrompt: "",
      },
    ];
    renderWithSections(readySections);

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate" })
    );

    // Modal should close and section should show generating status
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Status: Regenerating\.\.\./)).toBeInTheDocument();
    });
  });

  // --- Approval tracking integration tests ---

  it("editing an approved section immediately clears the approval badge", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const approvedSections: SectionState[] = [
      {
        id: "uuid-approved",
        name: "Approved Section",
        content: "Previously approved content.",
        status: "approved",
        originalPrompt: "",
        approval: {
          userName: "Jane",
          userEmail: "jane@example.com",
          timestamp: "2026-02-25T10:00:00Z",
        },
      },
    ];

    renderWithSections(approvedSections);

    // Approval badge should be visible initially
    await waitFor(() => {
      expect(screen.getByText(/Approved by Jane/)).toBeInTheDocument();
    });

    // Click Edit
    await userEvent.click(
      screen.getByRole("button", { name: /edit approved section/i })
    );

    // Approval badge should disappear immediately
    await waitFor(() => {
      expect(screen.queryByText(/Approved by/)).not.toBeInTheDocument();
    });
  });

  it("canceling an edit on an approved section restores the approval badge", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const approvedSections: SectionState[] = [
      {
        id: "uuid-approved",
        name: "Approved Section",
        content: "Previously approved content.",
        status: "approved",
        originalPrompt: "",
        approval: {
          userName: "Jane",
          userEmail: "jane@example.com",
          timestamp: "2026-02-25T10:00:00Z",
        },
      },
    ];

    renderWithSections(approvedSections);

    // Click Edit
    const editBtn = await screen.findByRole("button", {
      name: /edit approved section/i,
    });
    await userEvent.click(editBtn);

    // Badge should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Approved by/)).not.toBeInTheDocument();
    });

    // Click Cancel
    await userEvent.click(
      screen.getByRole("button", { name: /cancel editing approved section/i })
    );

    // Approval badge should be restored
    await waitFor(() => {
      expect(screen.getByText(/Approved by Jane/)).toBeInTheDocument();
    });
    // Status should be back to approved
    expect(screen.getByText(/Status: Approved/)).toBeInTheDocument();
  });

  it("re-approving after edit shows the new approver", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Bob Smith", email: "bob@example.com" })
    );

    const editedSections: SectionState[] = [
      {
        id: "uuid-edited",
        name: "Edited Section",
        content: "Content that was edited.",
        status: "edited",
        originalPrompt: "",
      },
    ];

    renderWithSections(editedSections);

    // No approval badge should be shown
    await waitFor(() => {
      expect(screen.getByText(/Status: Edited/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Approved by/)).not.toBeInTheDocument();

    // Approve the section
    await userEvent.click(
      screen.getByRole("button", { name: /approve edited section/i })
    );

    // Should now show Bob as approver
    await waitFor(() => {
      expect(screen.getByText(/Approved by Bob Smith/)).toBeInTheDocument();
    });
  });

  it("Approve All approves all ready/edited sections and shows approval badges", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const mixedSections: SectionState[] = [
      {
        id: "uuid-ready",
        name: "Ready Section",
        content: "Ready content.",
        status: "ready",
        originalPrompt: "",
      },
      {
        id: "uuid-edited",
        name: "Edited Section",
        content: "Edited content.",
        status: "edited",
        originalPrompt: "",
      },
      {
        id: "uuid-approved",
        name: "Already Approved",
        content: "Approved content.",
        status: "approved",
        originalPrompt: "",
        approval: {
          userName: "Bob",
          userEmail: "bob@example.com",
          timestamp: "2026-02-25T10:00:00Z",
        },
      },
    ];

    renderWithSections(mixedSections);

    const approveAllBtn = await screen.findByRole("button", {
      name: /approve all/i,
    });
    expect(approveAllBtn).toBeEnabled();
    await userEvent.click(approveAllBtn);

    // All sections should now be approved
    await waitFor(() => {
      expect(screen.getByText("All Approved")).toBeInTheDocument();
    });

    // Ready and Edited sections should show Jane as approver
    expect(screen.getAllByText(/Approved by Jane/).length).toBeGreaterThanOrEqual(2);
    // Already-approved section should still show Bob
    expect(screen.getByText(/Approved by Bob/)).toBeInTheDocument();
  });

  // --- Save Project integration test ---

  it("clicking Save Project calls downloadProjectFile with current project state", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const readySections: SectionState[] = [
      {
        id: "uuid-2",
        name: "Study Procedures",
        content: "The study will involve several procedures.",
        status: "ready",
        originalPrompt: "",
      },
    ];
    renderWithSections(readySections);

    const saveBtn = await screen.findByRole("button", {
      name: /save project/i,
    });
    await userEvent.click(saveBtn);

    expect(downloadProjectFile).toHaveBeenCalledTimes(1);
    expect(downloadProjectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolId: "protocol_test_123",
        sections: expect.arrayContaining([
          expect.objectContaining({ id: "uuid-2", name: "Study Procedures" }),
        ]),
      })
    );
  });

  // --- Export integration tests ---

  it("clicking PDF export calls exportDocument with correct args and shows success toast", async () => {
    const { exportDocument } = require("@/lib/api");
    const fakeBlob = new Blob(["%PDF-fake"], { type: "application/pdf" });
    exportDocument.mockResolvedValue(fakeBlob);

    // Mock download helpers (non-destructive — doesn't interfere with React DOM)
    global.URL.createObjectURL = jest.fn().mockReturnValue("blob:fake-url");
    global.URL.revokeObjectURL = jest.fn();

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const approvedSections: SectionState[] = [
      {
        id: "uuid-1",
        name: "Purpose of the Study",
        content: "Study purpose content.",
        status: "approved",
        originalPrompt: "",
        approval: { userName: "Jane", userEmail: "jane@example.com", timestamp: "2026-02-03T14:30:00Z" },
      },
    ];
    renderWithSections(approvedSections);

    const pdfBtn = await screen.findByRole("button", { name: /export as pdf/i });
    await userEvent.click(pdfBtn);

    await waitFor(() => {
      expect(exportDocument).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "uuid-1", name: "Purpose of the Study" }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({ sectionId: "uuid-1", userName: "Jane" }),
        ]),
        "pdf",
        expect.any(String),
      );
    });

    // Success toast
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Downloaded.*_ICF\.pdf/);
    });
  });

  it("shows error toast when export fails", async () => {
    const { exportDocument } = require("@/lib/api");
    exportDocument.mockRejectedValue(new Error("Server error"));

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const approvedSections: SectionState[] = [
      {
        id: "uuid-1",
        name: "Purpose",
        content: "Content.",
        status: "approved",
        originalPrompt: "",
        approval: { userName: "Jane", userEmail: "jane@example.com", timestamp: "2026-02-03T14:30:00Z" },
      },
    ];
    renderWithSections(approvedSections);

    const pdfBtn = await screen.findByRole("button", { name: /export as pdf/i });
    await userEvent.click(pdfBtn);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Server error");
    });
  });

  // --- Boilerplate / category tests ---

  it("does not show Regenerate button for conditional sections on dashboard", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const conditionalSections: SectionState[] = [
      {
        id: "uuid-cond",
        name: "Genetic Research",
        content: "[Boilerplate placeholder for Genetic Research]",
        status: "ready",
        originalPrompt: "",
        category: "conditional",
      },
    ];
    renderWithSections(conditionalSections);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: "Genetic Research" })
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /regenerate genetic research/i })
    ).not.toBeInTheDocument();
    // Approve and Edit should still be present
    expect(
      screen.getByRole("button", { name: /approve genetic research/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit genetic research/i })
    ).toBeInTheDocument();
  });

  it("does not show Regenerate button for signature sections on dashboard", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const signatureSections: SectionState[] = [
      {
        id: "uuid-sig",
        name: "Adult Consent",
        content: "[Boilerplate placeholder for Adult Consent]",
        status: "ready",
        originalPrompt: "",
        category: "signature",
      },
    ];
    renderWithSections(signatureSections);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: "Adult Consent" })
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /regenerate adult consent/i })
    ).not.toBeInTheDocument();
  });

  it("shows Regenerate button for standard sections on dashboard", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const standardSections: SectionState[] = [
      {
        id: "uuid-std",
        name: "Purpose of the Study",
        content: "LLM generated content.",
        status: "ready",
        originalPrompt: "",
        category: "standard",
      },
    ];
    renderWithSections(standardSections);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 3, name: "Purpose of the Study" })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /regenerate purpose/i })
    ).toBeInTheDocument();
  });

  it("renders empty state when sections array is empty", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const emptySections: SectionState[] = [];
    renderWithSections(emptySections);

    await waitFor(() => {
      expect(
        screen.getByText("No sections in this outline.")
      ).toBeInTheDocument();
    });
  });

  it("regenerate stream processes chunk and complete events", async () => {
    const { streamSectionRegenerate } = require("@/lib/sse");

    async function* fakeStream() {
      yield {
        event: "section_chunk" as const,
        sectionId: "uuid-2",
        content: "New content chunk",
      };
      yield {
        event: "section_complete" as const,
        sectionId: "uuid-2",
        status: "ready",
      };
    }
    streamSectionRegenerate.mockReturnValue(fakeStream());

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const readySections: SectionState[] = [
      {
        id: "uuid-2",
        name: "Study Procedures",
        content: "Old content.",
        status: "ready",
        originalPrompt: "",
      },
    ];
    renderWithSections(readySections);

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate" })
    );

    await waitFor(() => {
      expect(screen.getByText("New content chunk")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Status: Ready for review/)).toBeInTheDocument();
    });
  });

  it("regenerate stream processes error event", async () => {
    const { streamSectionRegenerate } = require("@/lib/sse");

    async function* fakeStream() {
      yield {
        event: "section_error" as const,
        sectionId: "uuid-2",
        message: "LLM generation failed",
      };
    }
    streamSectionRegenerate.mockReturnValue(fakeStream());

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const readySections: SectionState[] = [
      {
        id: "uuid-2",
        name: "Study Procedures",
        content: "Old content.",
        status: "ready",
        originalPrompt: "",
      },
    ];
    renderWithSections(readySections);

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate" })
    );

    await waitFor(() => {
      expect(screen.getByText(/Status: Error/)).toBeInTheDocument();
    });
    expect(screen.getByText("LLM generation failed")).toBeInTheDocument();
  });

  it("regenerate stream catch handles non-abort errors", async () => {
    const { streamSectionRegenerate } = require("@/lib/sse");

    async function* fakeStream(): AsyncGenerator<never> {
      throw new Error("Network failure");
    }
    streamSectionRegenerate.mockReturnValue(fakeStream());

    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const readySections: SectionState[] = [
      {
        id: "uuid-2",
        name: "Study Procedures",
        content: "Old content.",
        status: "ready",
        originalPrompt: "",
      },
    ];
    renderWithSections(readySections);

    const regenBtn = await screen.findByRole("button", {
      name: /regenerate study procedures/i,
    });
    await userEvent.click(regenBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Regenerate" })
    );

    await waitFor(() => {
      expect(screen.getByText(/Status: Error/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Network failure/)).toBeInTheDocument();
  });

  it("saving edits to an approved section clears approval and sets status to edited", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    const approvedSections: SectionState[] = [
      {
        id: "uuid-approved",
        name: "Approved Section",
        content: "Previously approved content.",
        status: "approved",
        originalPrompt: "",
        approval: {
          userName: "Jane",
          userEmail: "jane@example.com",
          timestamp: "2026-02-25T10:00:00Z",
        },
      },
    ];

    renderWithSections(approvedSections);

    // Approved section should show Edit button but not Approve button
    const editBtn = await screen.findByRole("button", {
      name: /edit approved section/i,
    });
    await userEvent.click(editBtn);

    const textarea = screen.getByRole("textbox", {
      name: /edit content for approved section/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Newly edited content.");

    await userEvent.click(
      screen.getByRole("button", { name: /save approved section/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Status: Edited/)).toBeInTheDocument();
    });
    expect(screen.getByText("Newly edited content.")).toBeInTheDocument();
    // Approve button should now be visible again (status is no longer approved)
    expect(
      screen.getByRole("button", { name: /approve approved section/i })
    ).toBeInTheDocument();
  });
});
