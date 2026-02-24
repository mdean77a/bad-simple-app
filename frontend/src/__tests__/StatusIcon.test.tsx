import { render, screen } from "@testing-library/react";
import { StatusIcon } from "@/components/common/StatusIcon";
import type { SectionStatus } from "@/types/project";

describe("StatusIcon", () => {
  const statuses: { status: SectionStatus; label: string; bgClass: string }[] = [
    { status: "generating", label: "Generating", bgClass: "bg-amber-400" },
    { status: "ready", label: "Ready", bgClass: "bg-teal-500" },
    { status: "editing", label: "Editing", bgClass: "bg-blue-500" },
    { status: "edited", label: "Edited", bgClass: "bg-slate-400" },
    { status: "approved", label: "Approved", bgClass: "bg-emerald-500" },
    { status: "error", label: "Error", bgClass: "bg-red-500" },
  ];

  it.each(statuses)(
    "renders $status status with correct aria-label and background",
    ({ status, label, bgClass }) => {
      render(<StatusIcon status={status} />);

      const icon = screen.getByLabelText(label);
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass(bgClass);
    }
  );

  it("renders an SVG icon inside the circle", () => {
    render(<StatusIcon status="ready" />);

    const icon = screen.getByLabelText("Ready");
    const svg = icon.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has fixed dimensions", () => {
    render(<StatusIcon status="approved" />);

    const icon = screen.getByLabelText("Approved");
    expect(icon).toHaveClass("h-8", "w-8");
  });
});
