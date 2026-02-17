import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutlinePage from "@/app/projects/[id]/outline/page";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({ id: "protocol_thapca_20260215" }),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    generateOutline: jest.fn(),
  };
});

const mockGenerateOutline = api.generateOutline as jest.MockedFunction<
  typeof api.generateOutline
>;

const mockSections: api.OutlineSection[] = [
  {
    sectionName: "Purpose of the Study",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
  {
    sectionName: "Study Procedures",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
  {
    sectionName: "Genetic Research",
    category: "conditional",
    isConditional: true,
    defaultChecked: true,
    detectionReason: "detected: genetic sample collection",
  },
  {
    sectionName: "Adult Consent",
    category: "signature",
    isConditional: true,
    defaultChecked: true,
    detectionReason: "detected: participants ages 18-65",
  },
];

const renderPage = () => {
  return render(
    <AuthProvider>
      <OutlinePage />
    </AuthProvider>
  );
};

describe("Outline Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
    mockReplace.mockReset();
    jest.resetAllMocks();
  });

  it("redirects to / when user is not logged in", async () => {
    mockGenerateOutline.mockReturnValue(new Promise(() => {}));
    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("shows loading state while generating outline", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockReturnValue(new Promise(() => {}));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Generating outline...")).toBeInTheDocument();
    });
  });

  it("renders outline checklist on successful generation", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockResolvedValue({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    expect(await screen.findByText("Purpose of the Study")).toBeInTheDocument();
    expect(screen.getByText("Study Procedures")).toBeInTheDocument();
    expect(screen.getByText("Genetic Research")).toBeInTheDocument();
    expect(screen.getByText("Adult Consent")).toBeInTheDocument();
    expect(screen.getByText("Standard Sections")).toBeInTheDocument();
    expect(screen.getByText("Conditional Sections")).toBeInTheDocument();
    expect(screen.getByText("Signature Pages")).toBeInTheDocument();
  });

  it("shows error state when generation fails with ApiError", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockRejectedValue(
      new api.ApiError("LLM_ERROR", "Model returned invalid JSON")
    );

    renderPage();

    expect(
      await screen.findByText("Model returned invalid JSON")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry/i })
    ).toBeInTheDocument();
  });

  it("shows generic error message on unexpected error", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockRejectedValue(new Error("Network failure"));

    renderPage();

    expect(
      await screen.findByText(
        "Failed to generate outline. Please try again."
      )
    ).toBeInTheDocument();
  });

  it("retries generation when Retry button is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockRejectedValueOnce(
      new api.ApiError("LLM_ERROR", "Temporary failure")
    );
    mockGenerateOutline.mockResolvedValueOnce({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);

    expect(await screen.findByText("Purpose of the Study")).toBeInTheDocument();
    expect(mockGenerateOutline).toHaveBeenCalledTimes(2);
  });

  it("renders page header with Review Outline title", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockResolvedValue({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Review Outline" })
      ).toBeInTheDocument();
    });
  });

  it("navigates to /projects/new when back button is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockResolvedValue({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /go back/i })
      ).toBeInTheDocument();
    });

    screen.getByRole("button", { name: /go back/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/projects/new");
  });

  it("toggles checkbox state when a section is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockResolvedValue({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    await screen.findByText("Purpose of the Study");

    const checkboxes = screen.getAllByRole("checkbox");
    // Purpose of the Study is checked by default
    expect(checkboxes[0]).toBeChecked();

    await userEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();

    await userEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
  });

  it("calls generateOutline with protocolId from URL params", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockGenerateOutline.mockResolvedValue({
      protocolId: "protocol_thapca_20260215",
      sections: mockSections,
    });

    renderPage();

    await waitFor(() => {
      expect(mockGenerateOutline).toHaveBeenCalledWith(
        "protocol_thapca_20260215"
      );
    });
  });
});
