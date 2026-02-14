import { render, screen, waitFor } from "@testing-library/react";
import NewProjectPage from "@/app/projects/new/page";
import { AuthProvider } from "@/lib/auth";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/api");

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
});
