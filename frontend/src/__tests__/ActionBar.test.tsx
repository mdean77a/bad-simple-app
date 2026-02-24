import { render, screen } from "@testing-library/react";
import { ActionBar } from "@/components/dashboard/ActionBar";

describe("ActionBar", () => {
  it("renders ICF Sections heading", () => {
    render(<ActionBar />);

    expect(
      screen.getByRole("heading", { level: 2, name: "ICF Sections" })
    ).toBeInTheDocument();
  });

  it("renders all action buttons", () => {
    render(<ActionBar />);

    expect(screen.getByText("Regenerate All")).toBeInTheDocument();
    expect(screen.getByText("Approve All Sections")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });

  it("disables all buttons", () => {
    render(<ActionBar />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
