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
  it("renders ICF Sections heading", () => {
    render(<ActionBar />);

    expect(
      screen.getByRole("heading", { level: 2, name: "ICF Sections" })
    ).toBeInTheDocument();
  });

  it("renders all action buttons when no sections provided", () => {
    render(<ActionBar />);

    expect(screen.getByText("Approve All Sections")).toBeInTheDocument();
    expect(screen.getByText("Regenerate All")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });

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

  it("disables Approve All when all sections are generating", () => {
    const sections = [makeSection({ status: "generating" })];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeDisabled();
  });

  it("disables Approve All when some sections are generating even if others are ready", () => {
    const sections = [
      makeSection({ id: "s1", status: "ready" }),
      makeSection({ id: "s2", status: "generating" }),
    ];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeDisabled();
  });

  it("shows 'All Approved' with check when all sections are approved", () => {
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

  it("disables Approve All when only error sections remain", () => {
    const sections = [
      makeSection({ id: "s1", status: "error" }),
      makeSection({ id: "s2", status: "approved" }),
    ];
    render(<ActionBar sections={sections} onApproveAll={jest.fn()} />);

    // Not all approved (error exists), but no approvable sections
    expect(
      screen.getByRole("button", { name: /approve all/i })
    ).toBeDisabled();
  });
});
