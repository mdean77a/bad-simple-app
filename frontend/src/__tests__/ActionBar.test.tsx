import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionBar } from "@/components/dashboard/ActionBar";
import type { SectionState } from "@/types/project";

const makeSection = (overrides: Partial<SectionState> = {}): SectionState => ({
  id: "sec-1",
  name: "Test Section",
  content: "Some content",
  status: "ready",
  originalPrompt: "",
  ...overrides,
});

describe("ActionBar", () => {
  // --- Layout & heading ---

  it("renders ICF Sections heading", () => {
    render(<ActionBar />);

    expect(
      screen.getByRole("heading", { level: 2, name: "ICF Sections" })
    ).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<ActionBar />);

    expect(screen.getByText("Approve All Sections")).toBeInTheDocument();
    expect(screen.getByText("Save Project")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });

  // --- Progress indicator ---

  it("does not show progress when no sections provided", () => {
    render(<ActionBar />);

    expect(screen.queryByText(/approved/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
  });

  it("shows 'X/Y approved' when sections exist", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "ready" }),
      makeSection({ id: "s3", status: "edited" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByText("1/3 approved")).toBeInTheDocument();
  });

  it("shows 'Generating...' when sections are generating", () => {
    const sections = [
      makeSection({ id: "s1", status: "generating" }),
      makeSection({ id: "s2", status: "approved" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(screen.queryByText(/\/.*approved/)).not.toBeInTheDocument();
  });

  it("shows 'Generating...' when sections are regenerating", () => {
    const sections = [makeSection({ status: "regenerating" })];
    render(<ActionBar sections={sections} />);

    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("shows progress with check icon when all approved", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "approved" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByText("2/2 approved")).toBeInTheDocument();
  });

  it("has correct aria-label on progress for screen readers", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "ready" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(
      screen.getByLabelText("1 of 2 sections approved")
    ).toBeInTheDocument();
  });

  it("has correct aria-label when generating", () => {
    const sections = [makeSection({ status: "generating" })];
    render(<ActionBar sections={sections} />);

    expect(
      screen.getByLabelText("Sections are generating")
    ).toBeInTheDocument();
  });

  // --- Approve All button ---

  it("disables Approve All when no sections provided", () => {
    render(<ActionBar />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeDisabled();
  });

  it("enables Approve All when sections are ready", () => {
    const sections = [makeSection({ status: "ready" })];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeEnabled();
  });

  it("enables Approve All when sections are edited", () => {
    const sections = [makeSection({ status: "edited" })];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeEnabled();
  });

  it("disables Approve All when generating", () => {
    const sections = [
      makeSection({ id: "s1", status: "ready" }),
      makeSection({ id: "s2", status: "generating" }),
    ];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeDisabled();
  });

  it("shows 'All Approved' when all sections are approved", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "approved" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByText("All Approved")).toBeInTheDocument();
    expect(screen.queryByText("Approve All Sections")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /all sections approved/i })
    ).toBeDisabled();
  });

  it("calls onApproveAll when button is clicked", async () => {
    const onApproveAll = jest.fn();
    const sections = [makeSection({ status: "ready" })];
    render(<ActionBar sections={sections} onApproveAll={onApproveAll} />);

    await userEvent.click(
      screen.getByRole("button", { name: /approve all/i })
    );

    expect(onApproveAll).toHaveBeenCalledTimes(1);
  });

  // --- Export buttons ---

  it("disables export buttons when not all sections are approved", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "ready" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByRole("button", { name: /export as pdf/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export as word/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export as markdown/i })).toBeDisabled();
  });

  it("enables export buttons when all sections are approved", () => {
    const sections = [
      makeSection({ id: "s1", status: "approved" }),
      makeSection({ id: "s2", status: "approved" }),
    ];
    render(<ActionBar sections={sections} />);

    expect(screen.getByRole("button", { name: /export as pdf/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /export as word/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /export as markdown/i })).toBeEnabled();
  });

  it("disables export buttons when no sections provided", () => {
    render(<ActionBar />);

    expect(screen.getByRole("button", { name: /export as pdf/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export as word/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export as markdown/i })).toBeDisabled();
  });

  // --- Save Project button ---

  it("enables Save Project when no sections are generating", () => {
    const sections = [makeSection({ status: "ready" })];
    render(<ActionBar sections={sections} />);

    expect(
      screen.getByRole("button", { name: /save project/i })
    ).toBeEnabled();
  });

  it("disables Save Project when sections are generating", () => {
    const sections = [makeSection({ status: "generating" })];
    render(<ActionBar sections={sections} />);

    expect(
      screen.getByRole("button", { name: /save project/i })
    ).toBeDisabled();
  });

  it("enables Save Project when no sections provided", () => {
    render(<ActionBar />);

    expect(
      screen.getByRole("button", { name: /save project/i })
    ).toBeEnabled();
  });
});
