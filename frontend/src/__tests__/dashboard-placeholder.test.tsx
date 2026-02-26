import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/projects/[id]/page";
import { AuthProvider } from "@/lib/auth";
import { ProjectProvider, useProject } from "@/lib/project";
import type { ConfirmedOutline, SectionState } from "@/types/project";

jest.mock("@/hooks/useSectionStreaming", () => ({
  useSectionStreaming: jest.fn(),
}));

jest.mock("@/lib/sse", () => ({
  streamSectionRegenerate: jest.fn(),
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
