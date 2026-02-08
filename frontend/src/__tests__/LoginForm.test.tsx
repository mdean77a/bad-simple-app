import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthProvider } from "@/lib/auth";

const renderLoginForm = () => {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
};

describe("LoginForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders name and email fields", () => {
    renderLoginForm();

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(nameInput, "John Doe");
    await user.click(submitButton);

    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("shows validation error for invalid email format", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    });
  });

  it("clears name error when user starts typing", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.click(submitButton);
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    await user.type(nameInput, "J");
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });

  it("clears email error when user starts typing", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(nameInput, "John Doe");
    await user.click(submitButton);
    expect(screen.getByText("Email is required")).toBeInTheDocument();

    await user.type(emailInput, "t");
    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
  });

  it("stores user in localStorage on successful submit", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.click(submitButton);

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    expect(storedUser).toEqual({
      name: "John Doe",
      email: "john@example.com",
    });
  });

  it("trims whitespace from name and email", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /continue/i });

    await user.type(nameInput, "  John Doe  ");
    await user.type(emailInput, "  john@example.com  ");
    await user.click(submitButton);

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    expect(storedUser).toEqual({
      name: "John Doe",
      email: "john@example.com",
    });
  });

  it("has proper accessibility attributes", () => {
    renderLoginForm();

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    expect(nameInput).toHaveAttribute("aria-invalid", "false");
    expect(emailInput).toHaveAttribute("aria-invalid", "false");
  });

  it("sets aria-invalid on fields with errors", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const submitButton = screen.getByRole("button", { name: /continue/i });
    await user.click(submitButton);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
  });
});
