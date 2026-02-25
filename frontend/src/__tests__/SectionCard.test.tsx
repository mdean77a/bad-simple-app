import { render, screen } from "@testing-library/react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import type { SectionState } from "@/types/project";

const readySection: SectionState = {
  id: "sec-1",
  name: "Purpose of the Study",
  content: "This study aims to evaluate the safety and efficacy of the treatment.",
  status: "ready",
  originalPrompt: "",
};

const generatingSection: SectionState = {
  id: "sec-2",
  name: "Study Procedures",
  content: "",
  status: "generating",
  originalPrompt: "",
};

const approvedSection: SectionState = {
  id: "sec-3",
  name: "Risks and Benefits",
  content: "There are several risks involved.",
  status: "approved",
  originalPrompt: "",
};

const errorSection: SectionState = {
  id: "sec-4",
  name: "Contact Information",
  content: "Generation failed: LLM timeout",
  status: "error",
  originalPrompt: "",
};

const generatingWithContent: SectionState = {
  id: "sec-5",
  name: "Partial Section",
  content: "Some partial content here",
  status: "generating",
  originalPrompt: "",
};

describe("SectionCard", () => {
  it("renders section name as heading", () => {
    render(<SectionCard section={readySection} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Purpose of the Study" })
    ).toBeInTheDocument();
  });

  it("renders as an article with aria-labelledby", () => {
    render(<SectionCard section={readySection} />);

    const article = screen.getByRole("article");
    const heading = screen.getByRole("heading", { level: 3 });
    expect(article).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("shows word count and status label", () => {
    render(<SectionCard section={readySection} />);

    expect(
      screen.getByText(/12 words.*Status: Ready for review/)
    ).toBeInTheDocument();
  });

  it("shows 0 words for empty content", () => {
    render(<SectionCard section={generatingSection} />);

    expect(
      screen.getByText(/0 words.*Status: Generating\.\.\./)
    ).toBeInTheDocument();
  });

  it("renders content with whitespace-pre-wrap", () => {
    render(<SectionCard section={readySection} />);

    const content = screen.getByText(readySection.content);
    expect(content).toHaveClass("whitespace-pre-wrap");
  });

  it("shows skeleton placeholder when generating with no content", () => {
    render(<SectionCard section={generatingSection} />);

    expect(screen.getByTestId("section-skeleton")).toBeInTheDocument();
    // No <p> with whitespace-pre-wrap should be rendered
    const contentPs = document.querySelectorAll(".whitespace-pre-wrap");
    expect(contentPs).toHaveLength(0);
  });

  it("shows content instead of skeleton when generating with partial content", () => {
    render(<SectionCard section={generatingWithContent} />);

    expect(screen.queryByTestId("section-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("Some partial content here")).toBeInTheDocument();
  });

  it("disables all action buttons when generating", () => {
    render(<SectionCard section={generatingSection} />);

    const approveBtn = screen.getByRole("button", {
      name: /approve study procedures/i,
    });
    const editBtn = screen.getByRole("button", {
      name: /edit study procedures/i,
    });
    const regenBtn = screen.getByRole("button", {
      name: /regenerate study procedures/i,
    });

    expect(approveBtn).toBeDisabled();
    expect(editBtn).toBeDisabled();
    expect(regenBtn).toBeDisabled();
  });

  it("enables all action buttons when ready", () => {
    render(<SectionCard section={readySection} />);

    const approveBtn = screen.getByRole("button", {
      name: /approve purpose/i,
    });
    const editBtn = screen.getByRole("button", { name: /edit purpose/i });
    const regenBtn = screen.getByRole("button", {
      name: /regenerate purpose/i,
    });

    expect(approveBtn).toBeEnabled();
    expect(editBtn).toBeEnabled();
    expect(regenBtn).toBeEnabled();
  });

  it("shows status icon matching the section status", () => {
    render(<SectionCard section={approvedSection} />);
    expect(screen.getByLabelText("Approved")).toBeInTheDocument();
  });

  it("applies amber border when generating", () => {
    const { container } = render(<SectionCard section={generatingSection} />);
    const contentArea = container.querySelector(".border-l-amber-400");
    expect(contentArea).toBeInTheDocument();
  });

  it("applies emerald border when approved", () => {
    const { container } = render(<SectionCard section={approvedSection} />);
    const contentArea = container.querySelector(".border-l-emerald-500");
    expect(contentArea).toBeInTheDocument();
  });

  it("applies red border when error", () => {
    const { container } = render(<SectionCard section={errorSection} />);
    const contentArea = container.querySelector(".border-l-red-500");
    expect(contentArea).toBeInTheDocument();
  });

  it("shows Approve, Edit, and Regenerate button labels", () => {
    render(<SectionCard section={readySection} />);

    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
  });

  it("applies scrollable classes to content area", () => {
    const { container } = render(<SectionCard section={readySection} />);
    const contentArea = container.querySelector(".max-h-96.overflow-y-auto");
    expect(contentArea).toBeInTheDocument();
  });

  it("applies error text styling when status is error", () => {
    render(<SectionCard section={errorSection} />);

    const content = screen.getByText("Generation failed: LLM timeout");
    expect(content).toHaveClass("text-red-700");
    expect(content).toHaveClass("font-medium");
    expect(content).not.toHaveClass("text-slate-700");
  });
});
