import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewProjectPage from "@/app/projects/new/page";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    uploadProtocol: jest.fn(),
    fetchProtocols: jest.fn().mockResolvedValue([]),
  };
});

const mockFetchProtocols = api.fetchProtocols as jest.MockedFunction<
  typeof api.fetchProtocols
>;
const mockUploadProtocol = api.uploadProtocol as jest.MockedFunction<
  typeof api.uploadProtocol
>;

const renderPage = () => {
  return render(
    <AuthProvider>
      <NewProjectPage />
    </AuthProvider>
  );
};

describe("New Project Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it("redirects to / when user is not logged in", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("renders page header with New Project title", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "New Project" })
      ).toBeInTheDocument();
    });
  });

  it("renders back button in header", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /go back/i })
      ).toBeInTheDocument();
    });
  });

  it("renders the protocol upload component", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByLabelText("Upload protocol PDF")
      ).toBeInTheDocument();
    });
  });

  it("renders Upload New Protocol section heading", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Upload New Protocol" })
      ).toBeInTheDocument();
    });
  });

  it("renders Or Select Existing Protocol section heading", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Or Select Existing Protocol",
        })
      ).toBeInTheDocument();
    });
  });

  it("renders Continue button disabled initially", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      const continueBtn = screen.getByRole("button", { name: /continue/i });
      expect(continueBtn).toBeDisabled();
    });
  });

  it("navigates to / when back button is clicked", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /go back/i })
      ).toBeInTheDocument();
    });

    screen.getByRole("button", { name: /go back/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("navigates to outline page when Continue is clicked after upload success", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockUploadProtocol.mockResolvedValue({
      protocolId: "protocol_uploaded_123",
      protocolName: "Uploaded Protocol",
      acronym: "TEST",
    });

    renderPage();

    // Drop a file
    const dropZone = await screen.findByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Enter acronym and upload
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "TEST");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    // Wait for upload success
    await screen.findByText("Protocol uploaded successfully");

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeEnabled();
    await userEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledWith(
      "/projects/protocol_uploaded_123/outline"
    );
  });

  it("navigates to outline page when Continue is clicked after protocol selection", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ name: "Jane", email: "jane@example.com" })
    );
    mockFetchProtocols.mockResolvedValue([
      {
        protocolId: "protocol_diabetes_20260203",
        protocolName: "Diabetes Study",
        indexedAt: "2026-02-03T14:30:00+00:00",
      },
    ]);

    renderPage();

    const select = await screen.findByLabelText("Select a protocol");
    await userEvent.selectOptions(select, "protocol_diabetes_20260203");

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeEnabled();
    await userEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledWith(
      "/projects/protocol_diabetes_20260203/outline"
    );
  });
});
