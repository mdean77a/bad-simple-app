import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/projects/[id]/page";
import { AuthProvider } from "@/lib/auth";
import { ProjectProvider, useProject } from "@/lib/project";
import type { ConfirmedOutline, SectionState } from "@/types/project";

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
});
