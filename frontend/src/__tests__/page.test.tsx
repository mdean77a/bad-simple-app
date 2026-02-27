import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Home from "@/app/page";
import { AuthProvider } from "@/lib/auth";
import { ProjectProvider } from "@/lib/project";
import * as api from "@/lib/api";
import * as projectFileLib from "@/lib/projectFile";
import type { ProjectState } from "@/types/project";

jest.mock("@/lib/api");
jest.mock("@/lib/projectFile", () => ({
  ...jest.requireActual("@/lib/projectFile"),
  readProjectFile: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock("next/link", () => {
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
});
const mockCheckHealth = api.checkHealth as jest.MockedFunction<typeof api.checkHealth>;
const mockReadProjectFile = projectFileLib.readProjectFile as jest.MockedFunction<typeof projectFileLib.readProjectFile>;

const renderHome = () => {
  return render(
    <AuthProvider>
      <ProjectProvider>
        <Home />
      </ProjectProvider>
    </AuthProvider>
  );
};

function createMockFile(content: string, name = "test.json"): File {
  const file = new File([content], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

const validProject: ProjectState = {
  protocolId: "protocol_test_123",
  protocolName: "Test Protocol",
  outline: {
    sections: ["Purpose", "Procedures"],
    confirmedAt: "2026-01-01T00:00:00.000Z",
    confirmedBy: { name: "Tester", email: "test@example.com" },
  },
  sections: [
    {
      id: "s1",
      name: "Purpose",
      content: "Test content",
      status: "approved",
      originalPrompt: "prompt",
      approval: { userName: "Tester", userEmail: "test@example.com", timestamp: "2026-01-01T00:00:00.000Z" },
    },
  ],
  generatedOutline: null,
};

describe("Home Page", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCheckHealth.mockResolvedValue({ status: "ok" });
    mockPush.mockClear();
    mockReadProjectFile.mockReset();
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

  it("shows enabled Continue Saved Project button on authenticated page", async () => {
    const storedUser = { name: "John Doe", email: "john@example.com" };
    localStorage.setItem("user", JSON.stringify(storedUser));

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
    });

    const continueButton = screen.getByRole("button", {
      name: /continue saved project/i,
    });
    expect(continueButton).toBeEnabled();
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

  describe("Continue Saved Project", () => {
    beforeEach(() => {
      const storedUser = { name: "John Doe", email: "john@example.com" };
      localStorage.setItem("user", JSON.stringify(storedUser));
    });

    it("has a hidden file input that accepts .json files", async () => {
      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("accept", ".json");
      expect(fileInput).toHaveClass("hidden");
    });

    it("loads valid project file and navigates to dashboard when outline exists", async () => {
      mockReadProjectFile.mockResolvedValue({ project: validProject });

      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(JSON.stringify({}));
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/projects/${validProject.protocolId}`);
      });
    });

    it("loads valid project file and navigates to outline page when no outline", async () => {
      const projectNoOutline: ProjectState = {
        ...validProject,
        outline: null,
        sections: [],
      };
      mockReadProjectFile.mockResolvedValue({ project: projectNoOutline });

      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(JSON.stringify({}));
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/projects/${projectNoOutline.protocolId}/outline`);
      });
    });

    it("shows error message for invalid project file", async () => {
      mockReadProjectFile.mockRejectedValue(new Error("Invalid project file: not valid JSON"));

      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile("not json");
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Invalid project file: not valid JSON");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("shows version warning via alert but still loads project", async () => {
      mockReadProjectFile.mockResolvedValue({
        project: validProject,
        warnings: ['Unrecognized version "2.0" (current: 1.0). File will be loaded with best effort.'],
      });

      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile(JSON.stringify({}));
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Unrecognized version "2.0" (current: 1.0). File will be loaded with best effort.'
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(`/projects/${validProject.protocolId}`);
      });

      alertSpy.mockRestore();
    });

    it("does not navigate when file picker is cancelled (no file selected)", async () => {
      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockReadProjectFile).not.toHaveBeenCalled();
    });

    it("clears error when a new file is selected successfully", async () => {
      // First: trigger an error
      mockReadProjectFile.mockRejectedValueOnce(new Error("Invalid project file"));

      const { container } = renderHome();

      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2, name: /Welcome back/i })).toBeInTheDocument();
      });

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const badFile = createMockFile("bad");
      fireEvent.change(fileInput, { target: { files: [badFile] } });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Second: select a valid file
      mockReadProjectFile.mockResolvedValueOnce({ project: validProject });
      const goodFile = createMockFile(JSON.stringify({}));
      fireEvent.change(fileInput, { target: { files: [goodFile] } });

      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });
});
