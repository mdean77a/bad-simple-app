import { render, screen } from "@testing-library/react";
import {
  ApprovalBadge,
  formatApprovalDate,
} from "@/components/dashboard/ApprovalBadge";

describe("formatApprovalDate", () => {
  it("formats an ISO date as 'MMM D, YYYY at h:mm AM/PM'", () => {
    const date = new Date(2026, 1, 3, 14, 30, 0); // Feb 3, 2026 2:30 PM local
    expect(formatApprovalDate(date.toISOString())).toBe(
      "Feb 3, 2026 at 2:30 PM"
    );
  });

  it("formats midnight correctly as 12:00 AM", () => {
    // Use a date that is midnight in local timezone
    const midnight = new Date(2026, 0, 15, 0, 0, 0);
    const result = formatApprovalDate(midnight.toISOString());
    expect(result).toContain("12:00 AM");
    expect(result).toContain("Jan 15, 2026");
  });

  it("formats noon correctly as 12:00 PM", () => {
    const noon = new Date(2026, 5, 10, 12, 0, 0);
    const result = formatApprovalDate(noon.toISOString());
    expect(result).toContain("12:00 PM");
    expect(result).toContain("Jun 10, 2026");
  });

  it("pads single-digit minutes with a leading zero", () => {
    const date = new Date(2026, 2, 5, 9, 5, 0);
    const result = formatApprovalDate(date.toISOString());
    expect(result).toContain("9:05 AM");
  });

  it("returns the original string for an invalid date", () => {
    expect(formatApprovalDate("not-a-date")).toBe("not-a-date");
  });
});

describe("ApprovalBadge", () => {
  const defaultProps = {
    userName: "Sarah Chen",
    timestamp: new Date(2026, 1, 25, 14, 30, 0).toISOString(),
  };

  it("renders the approver name", () => {
    render(<ApprovalBadge {...defaultProps} />);
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
  });

  it("renders the formatted timestamp", () => {
    render(<ApprovalBadge {...defaultProps} />);
    expect(screen.getByText(/Feb 25, 2026 at 2:30 PM/)).toBeInTheDocument();
  });

  it("renders 'Approved by' prefix text", () => {
    render(<ApprovalBadge {...defaultProps} />);
    expect(screen.getByText(/Approved by Sarah Chen on/)).toBeInTheDocument();
  });

  it("renders a check-circle icon with aria-hidden", () => {
    const { container } = render(<ApprovalBadge {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders with different user names", () => {
    render(<ApprovalBadge userName="John Doe" timestamp={defaultProps.timestamp} />);
    expect(screen.getByText(/Approved by John Doe/)).toBeInTheDocument();
  });
});
