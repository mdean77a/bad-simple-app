import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthProvider } from "@/lib/auth";

const renderPageHeader = (props: {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
} = {}) => {
  return render(
    <AuthProvider>
      <PageHeader {...props} />
    </AuthProvider>
  );
};

describe("PageHeader", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("user display", () => {
    it("displays the logged-in user's name", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test Page" });

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("does not display user name when no user is logged in", () => {
      renderPageHeader({ title: "Test Page" });

      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  describe("title", () => {
    it("displays the title when provided", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "My Page Title" });

      expect(
        screen.getByRole("heading", { level: 1, name: "My Page Title" })
      ).toBeInTheDocument();
    });

    it("does not render a heading when no title is provided", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader();

      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("logout", () => {
    it("renders a logout button", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      expect(
        screen.getByRole("button", { name: /logout/i })
      ).toBeInTheDocument();
    });

    it("clears user data from localStorage on logout", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      await user.click(screen.getByRole("button", { name: /logout/i }));

      expect(localStorage.getItem("user")).toBeNull();
    });

    it("clears user from context on logout", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /logout/i }));

      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  describe("back navigation", () => {
    it("shows back button when showBack is true", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test", showBack: true, onBack: jest.fn() });

      expect(
        screen.getByRole("button", { name: /go back/i })
      ).toBeInTheDocument();
    });

    it("does not show back button when showBack is false", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test", showBack: false });

      expect(
        screen.queryByRole("button", { name: /go back/i })
      ).not.toBeInTheDocument();
    });

    it("does not show back button by default", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      expect(
        screen.queryByRole("button", { name: /go back/i })
      ).not.toBeInTheDocument();
    });

    it("calls onBack when back button is clicked", async () => {
      const user = userEvent.setup();
      const onBack = jest.fn();
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test", showBack: true, onBack });

      await user.click(screen.getByRole("button", { name: /go back/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("has banner role on the header element", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("logout button has accessible label", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      expect(logoutButton).toHaveAttribute("aria-label", "Logout");
    });

    it("back button has accessible label", () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test", showBack: true, onBack: jest.fn() });

      const backButton = screen.getByRole("button", { name: /go back/i });
      expect(backButton).toHaveAttribute("aria-label", "Go back");
    });

    it("logout button is keyboard accessible via Enter", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        "user",
        JSON.stringify({ name: "Jane Smith", email: "jane@example.com" })
      );

      renderPageHeader({ title: "Test" });

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      logoutButton.focus();
      await user.keyboard("{Enter}");

      expect(localStorage.getItem("user")).toBeNull();
    });
  });
});
