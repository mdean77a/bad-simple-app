import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const editedSection: SectionState = {
  id: "sec-6",
  name: "Edited Section",
  content: "Previously edited content here.",
  status: "edited",
  originalPrompt: "",
};

const editingSection: SectionState = {
  id: "sec-7",
  name: "Currently Editing",
  content: "Content being edited.",
  status: "editing",
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

  it("hides Approve button when approved", () => {
    render(<SectionCard section={approvedSection} />);

    expect(
      screen.queryByRole("button", { name: /approve risks/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit risks/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /regenerate risks/i })
    ).toBeInTheDocument();
  });

  it("shows Approve button when ready", () => {
    render(<SectionCard section={readySection} />);
    expect(
      screen.getByRole("button", { name: /approve purpose/i })
    ).toBeInTheDocument();
  });

  it("calls onApprove when Approve button is clicked", async () => {
    const onApprove = jest.fn();
    render(<SectionCard section={readySection} onApprove={onApprove} />);

    await userEvent.click(
      screen.getByRole("button", { name: /approve purpose/i })
    );

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("disables all action buttons when error", () => {
    render(<SectionCard section={errorSection} />);

    expect(
      screen.getByRole("button", { name: /approve contact/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /edit contact/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /regenerate contact/i })
    ).toBeDisabled();
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

  // --- Inline editing tests ---

  it("calls onEdit and shows textarea when Edit button is clicked", async () => {
    const onEdit = jest.fn();
    render(<SectionCard section={readySection} onEdit={onEdit} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("textbox", { name: /edit content for purpose/i })
    ).toBeInTheDocument();
  });

  it("populates textarea with section content when editing", async () => {
    render(<SectionCard section={readySection} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    const textarea = screen.getByRole("textbox", {
      name: /edit content for purpose/i,
    });
    expect(textarea).toHaveValue(readySection.content);
  });

  it("shows Save and Cancel buttons when editing, hides Approve/Edit/Regenerate", async () => {
    render(<SectionCard section={readySection} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    expect(
      screen.getByRole("button", { name: /save purpose/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel editing purpose/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /approve purpose/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit purpose/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /regenerate purpose/i })
    ).not.toBeInTheDocument();
  });

  it("calls onSave with modified text when Save is clicked", async () => {
    const onSave = jest.fn();
    render(<SectionCard section={readySection} onSave={onSave} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    const textarea = screen.getByRole("textbox", {
      name: /edit content for purpose/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated content");

    await userEvent.click(
      screen.getByRole("button", { name: /save purpose/i })
    );

    expect(onSave).toHaveBeenCalledWith("Updated content");
  });

  it("calls onCancel and discards changes when Cancel is clicked", async () => {
    const onCancel = jest.fn();
    render(<SectionCard section={readySection} onCancel={onCancel} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    const textarea = screen.getByRole("textbox", {
      name: /edit content for purpose/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Some changes");

    await userEvent.click(
      screen.getByRole("button", { name: /cancel editing purpose/i })
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
    // Should exit editing mode and show original content
    expect(
      screen.queryByRole("textbox")
    ).not.toBeInTheDocument();
    expect(screen.getByText(readySection.content)).toBeInTheDocument();
  });

  it("updates word count while editing", async () => {
    render(<SectionCard section={readySection} />);

    await userEvent.click(
      screen.getByRole("button", { name: /edit purpose/i })
    );

    const textarea = screen.getByRole("textbox", {
      name: /edit content for purpose/i,
    });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "One two three");

    expect(screen.getByText(/3 words/)).toBeInTheDocument();
  });

  it("Edit button is enabled for ready status", () => {
    render(<SectionCard section={readySection} />);
    expect(
      screen.getByRole("button", { name: /edit purpose/i })
    ).toBeEnabled();
  });

  it("Edit button is enabled for edited status", () => {
    render(<SectionCard section={editedSection} />);
    expect(
      screen.getByRole("button", { name: /edit edited section/i })
    ).toBeEnabled();
  });

  it("Edit button is enabled for approved status", () => {
    render(<SectionCard section={approvedSection} />);
    expect(
      screen.getByRole("button", { name: /edit risks/i })
    ).toBeEnabled();
  });

  it("hides Edit button when status is editing", () => {
    render(<SectionCard section={editingSection} />);
    expect(
      screen.queryByRole("button", { name: /edit currently editing/i })
    ).not.toBeInTheDocument();
  });

  // --- Regenerate button tests ---

  it("calls onRegenerate when Regenerate button is clicked", async () => {
    const onRegenerate = jest.fn();
    render(<SectionCard section={readySection} onRegenerate={onRegenerate} />);

    await userEvent.click(
      screen.getByRole("button", { name: /regenerate purpose/i })
    );

    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("does not call onRegenerate when button is disabled", () => {
    const onRegenerate = jest.fn();
    render(<SectionCard section={generatingSection} onRegenerate={onRegenerate} />);

    const btn = screen.getByRole("button", { name: /regenerate study procedures/i });
    expect(btn).toBeDisabled();
  });
});
