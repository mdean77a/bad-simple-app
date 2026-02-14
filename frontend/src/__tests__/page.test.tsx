import { render, screen, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import { AuthProvider } from "@/lib/auth";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
jest.mock("next/link", () => {
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
});
const mockCheckHealth = api.checkHealth as jest.MockedFunction<typeof api.checkHealth>;

const renderHome = () => {
  return render(
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
};

describe("Home Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCheckHealth.mockResolvedValue({ status: "ok" });
  });

  it("shows login form when user is not logged in", async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
  });

  it("shows authenticated landing page when user is logged in", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: /Welcome back, John Doe/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /new project/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue saved project/i })
    ).toBeInTheDocument();
  });

  it("shows New Project as an enabled link to /projects/new", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
    });

    const newProjectLink = screen.getByRole("link", {
      name: /new project/i,
    });
    expect(newProjectLink).toHaveAttribute("href", "/projects/new");
  });

  it("shows disabled Continue Saved Project button on authenticated page", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole("button", {
      name: /continue saved project/i,
    });
    expect(continueButton).toBeDisabled();
  });

  it("shows ICF Generator title on login page", async () => {
    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "ICF Generator"
      );
    });
  });

  it("shows ICF Generator title on authenticated page", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "ICF Generator" })
      ).toBeInTheDocument();
    });
  });

  it("shows PageHeader with user name and logout on authenticated page", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /logout/i })
    ).toBeInTheDocument();
  });

  it("shows 'Backend connected' when health check succeeds", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByText("Backend connected")).toBeInTheDocument();
    });
  });

  it("shows 'Backend unavailable' when health check fails", async () => {
    mockCheckHealth.mockRejectedValue(new Error("Network error"));
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    });
  });

  it("shows 'Checking backend...' initially", async () => {
    mockCheckHealth.mockReturnValue(new Promise(() => {})); // never resolves
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByText("Checking backend...")).toBeInTheDocument();
    });
  });
});
