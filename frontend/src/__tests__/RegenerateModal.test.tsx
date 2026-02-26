import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegenerateModal } from "@/components/dashboard/RegenerateModal";

describe("RegenerateModal", () => {
  const defaultProps = {
    sectionName: "Purpose of the Study",
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    render(<RegenerateModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog with section name when open", () => {
    render(<RegenerateModal {...defaultProps} />);
    expect(
      screen.getByRole("dialog", { name: /regenerate purpose of the study/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Regenerate: Purpose of the Study/)).toBeInTheDocument();
  });

  it("renders guidance textarea", () => {
    render(<RegenerateModal {...defaultProps} />);
    expect(
      screen.getByRole("textbox", { name: /guidance for regeneration/i })
    ).toBeInTheDocument();
  });

  it("calls onSubmit with trimmed guidance when Regenerate is clicked", async () => {
    render(<RegenerateModal {...defaultProps} />);

    const textarea = screen.getByRole("textbox", { name: /guidance/i });
    await userEvent.type(textarea, "  Be more concise  ");

    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith("Be more concise");
  });

  it("calls onSubmit with empty string when no guidance provided", async () => {
    render(<RegenerateModal {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    expect(defaultProps.onSubmit).toHaveBeenCalledWith("");
  });

  it("calls onClose when Cancel is clicked", async () => {
    render(<RegenerateModal {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("clears guidance text after submit", async () => {
    const { rerender } = render(<RegenerateModal {...defaultProps} />);

    const textarea = screen.getByRole("textbox", { name: /guidance/i });
    await userEvent.type(textarea, "Some guidance");
    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));

    // Re-render as if modal was reopened
    rerender(<RegenerateModal {...defaultProps} />);
    expect(
      screen.getByRole("textbox", { name: /guidance/i })
    ).toHaveValue("");
  });

  it("clears guidance text after cancel", async () => {
    const { rerender } = render(<RegenerateModal {...defaultProps} />);

    const textarea = screen.getByRole("textbox", { name: /guidance/i });
    await userEvent.type(textarea, "Some guidance");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Re-render as if modal was reopened
    rerender(<RegenerateModal {...defaultProps} />);
    expect(
      screen.getByRole("textbox", { name: /guidance/i })
    ).toHaveValue("");
  });

  it("shows placeholder text in textarea", () => {
    render(<RegenerateModal {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/use simpler language/i)
    ).toBeInTheDocument();
  });
});
